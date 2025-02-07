import type { Runtime } from 'webextension-polyfill';

import { contentScriptMessage, portForwardingMessage, sendMessage } from '@proton/pass/extension/message';
import type { ProxiedSettings } from '@proton/pass/store/reducers/settings';
import type { Maybe, MaybeNull, WorkerState } from '@proton/pass/types';
import { WorkerMessageType } from '@proton/pass/types';
import { createElement, pixelEncoder } from '@proton/pass/utils/dom';
import { safeCall, waitUntil } from '@proton/pass/utils/fp';
import { createListenerStore } from '@proton/pass/utils/listener';
import { merge } from '@proton/pass/utils/object';

import { EXTENSION_PREFIX } from '../../constants';
import type {
    IFrameApp,
    IFrameDimensions,
    IFrameEndpoint,
    IFrameMessageWithSender,
    IFramePortMessageHandler,
    IFramePosition,
    IFrameSecureMessage,
    IFrameState,
} from '../../types/iframe';
import { type IFrameMessage, IFrameMessageType } from '../../types/iframe';
import { createIframeRoot } from './create-iframe-root';

type CreateIFrameAppOptions = {
    id: IFrameEndpoint;
    src: string;
    animation: 'slidein' | 'fadein';
    classNames?: string[];
    backdropClose: boolean;
    backdropExclude?: () => HTMLElement[];
    onReady?: () => void;
    onOpen?: () => void;
    onClose?: IFrameApp['close'];
    position: (iframeRoot: HTMLDivElement) => IFramePosition;
    dimensions: () => IFrameDimensions;
};

export const createIFrameApp = ({
    id,
    src,
    animation,
    classNames = [],
    backdropClose,
    backdropExclude,
    onOpen,
    onClose,
    position,
    dimensions,
}: CreateIFrameAppOptions): IFrameApp => {
    const iframeRoot = createIframeRoot();
    const portMessageHandlers: Map<IFrameMessageType, IFramePortMessageHandler> = new Map();

    const state: IFrameState = {
        visible: false,
        ready: false,
        loaded: false,
        port: null,
        framePort: null,
        position: { top: -1, left: -1, zIndex: -1 },
    };

    const listeners = createListenerStore();

    const iframe = createElement<HTMLIFrameElement>({
        type: 'iframe',
        classNames: [`${EXTENSION_PREFIX}-iframe`, ...classNames],
        attributes: { src },
        parent: iframeRoot,
    });

    iframe.style.setProperty(`--${EXTENSION_PREFIX}-iframe-animation`, `${EXTENSION_PREFIX}-anim-${animation}`);
    iframe.addEventListener('load', () => (state.loaded = true), { once: true });

    /* Securing the posted message's allowed target origins.
     * Ensure the iframe has been correctly loaded before sending
     * out any message: the iframe.contentWindow::origin may be
     * incorrect otherwise */
    const sendSecurePostMessage = async (message: IFrameMessage) => {
        await sendMessage.onSuccess(
            contentScriptMessage({ type: WorkerMessageType.RESOLVE_EXTENSION_KEY }),
            async ({ key }) =>
                waitUntil(() => state.loaded, 100).then(() => {
                    const secureMessage: IFrameSecureMessage = { ...message, key, sender: 'contentscript' };
                    iframe.contentWindow?.postMessage(secureMessage, iframe.src);
                })
        );
    };

    /* In order to communicate with the iframe, we're leveraging
     * the worker's MessageBroker port-forwarding capabilities.
     * This allows by-passing a FF limitation not letting us access
     * the Tabs API in an iframe-injected `web_accessible_resource`
     * to directly open a port with the current tab */
    const sendPortMessage = (rawMessage: IFrameMessage) => {
        const message: IFrameMessageWithSender = { ...rawMessage, sender: 'contentscript' };
        void waitUntil(() => state.ready, 100).then(() =>
            state.port?.postMessage(portForwardingMessage(state.framePort!, message))
        );
    };

    /* As we are now using a single port for the whole content-script,
     * make sure to filter messages not only by type but by sender id */
    const registerMessageHandler = <M extends IFrameMessageType>(
        type: M,
        handler: (message: IFrameMessageWithSender<M>) => void
    ) => {
        const safeHandler = (message: Maybe<IFrameMessageWithSender>) =>
            message?.type === type && message.sender === id && handler(message as IFrameMessageWithSender<M>);

        portMessageHandlers.set(type, safeHandler);
        return () => portMessageHandlers.delete(type);
    };

    const getPosition = (): IFramePosition => state.position;

    const setIframePosition = (values: IFramePosition) => {
        state.position = values;

        const { top, left, right, zIndex } = values;
        iframe.style.setProperty(`--${EXTENSION_PREFIX}-iframe-zindex`, `${zIndex ?? 1}`);
        iframe.style.setProperty(`--${EXTENSION_PREFIX}-iframe-top`, pixelEncoder(top));
        iframe.style.setProperty(`--${EXTENSION_PREFIX}-iframe-left`, left ? pixelEncoder(left) : 'unset');
        iframe.style.setProperty(`--${EXTENSION_PREFIX}-iframe-right`, right ? pixelEncoder(right) : 'unset');
    };

    const setIframeDimensions = ({ width, height }: IFrameDimensions) => {
        iframe.style.setProperty(`--${EXTENSION_PREFIX}-iframe-width`, pixelEncoder(width));
        iframe.style.setProperty(`--${EXTENSION_PREFIX}-iframe-height`, pixelEncoder(height));
    };

    const updatePosition = () => requestAnimationFrame(() => setIframePosition(position(iframeRoot)));

    const close: IFrameApp['close'] = (options) => {
        if (state.visible) {
            void sendPortMessage({ type: IFrameMessageType.IFRAME_HIDDEN });
            const target = options?.event?.target as Maybe<MaybeNull<HTMLElement>>;

            if (!target || !backdropExclude?.().includes(target)) {
                listeners.removeAll();
                state.visible = false;

                requestAnimationFrame(() => {
                    onClose?.({ userInitiated: options?.userInitiated ?? true, refocus: options?.refocus ?? false });
                    iframe.classList.remove(`${EXTENSION_PREFIX}-iframe--visible`);
                });
            }
        }
    };

    const open = (scrollRef?: HTMLElement) => {
        if (!state.visible) {
            state.visible = true;

            listeners.addListener(window, 'resize', updatePosition);
            listeners.addListener(scrollRef, 'scroll', updatePosition);

            if (backdropClose) {
                listeners.addListener(window, 'mousedown', (event) =>
                    close({ event, userInitiated: true, refocus: false })
                );
            }

            sendPortMessage({ type: IFrameMessageType.IFRAME_OPEN });

            iframe.classList.add(`${EXTENSION_PREFIX}-iframe--visible`);
            setIframeDimensions(dimensions());
            updatePosition();
            onOpen?.();
        }
    };

    const onMessageHandler = (message: Maybe<IFrameMessageWithSender>) =>
        message && message?.type !== undefined && portMessageHandlers.get(message.type)?.(message);

    const init = (port: Runtime.Port) => {
        void sendSecurePostMessage({
            type: IFrameMessageType.IFRAME_INJECT_PORT,
            payload: { port: port.name },
        });

        state.port = port;
        state.port.onMessage.addListener(onMessageHandler);
    };

    const reset = (workerState: WorkerState, settings: ProxiedSettings) => {
        sendPortMessage({ type: IFrameMessageType.IFRAME_INIT, payload: { workerState, settings } });
    };

    const destroy = () => {
        close({ userInitiated: false, refocus: false });
        listeners.removeAll();
        state.port?.onMessage.removeListener(onMessageHandler);
        safeCall(() => iframeRoot.removeChild(iframe))();
        state.port = null;
    };

    registerMessageHandler(IFrameMessageType.IFRAME_CONNECTED, ({ payload: { framePort } }) => {
        state.ready = true;
        state.framePort = framePort;
    });

    registerMessageHandler(IFrameMessageType.IFRAME_CLOSE, (message) =>
        close({ userInitiated: true, refocus: message.payload?.refocus ?? false })
    );

    registerMessageHandler(IFrameMessageType.IFRAME_DIMENSIONS, (message) => {
        const { width, height } = merge(dimensions(), { height: message.payload.height });
        return setIframeDimensions({ width, height });
    });

    return {
        element: iframe,
        state,
        sendPortMessage,
        registerMessageHandler,
        getPosition,
        updatePosition,
        reset,
        open,
        close,
        destroy,
        init,
    };
};
