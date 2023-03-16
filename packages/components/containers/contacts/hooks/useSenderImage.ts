import { useRef } from 'react';

import { useIsDarkTheme } from '@proton/components';
import { useAuthentication, useConfig } from '@proton/components/hooks';

import { getImageSize, getSenderImageUrl } from '../helpers/senderImage';

/**
 * Return the sender image URL for a given email address
 * @param emailAddress email address to get the sender image for
 * @param bimiSelector
 * @returns the sender image URL
 */
const useSenderImage = (emailAddress: string, bimiSelector?: string) => {
    const isDarkTheme = useIsDarkTheme();
    const imageSizeRef = useRef(getImageSize());
    const mode = isDarkTheme ? 'dark' : 'light';
    const { UID } = useAuthentication();
    const { API_URL } = useConfig();
    return emailAddress ? getSenderImageUrl(API_URL, UID, emailAddress, imageSizeRef.current, bimiSelector, mode) : '';
};

export default useSenderImage;
