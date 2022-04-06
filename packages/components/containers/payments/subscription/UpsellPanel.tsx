import { c, msgid } from 'ttag';
import { format } from 'date-fns';
import {
    CYCLE,
    DEFAULT_CURRENCY,
    PLANS,
    PLAN_NAMES,
    APPS,
    BRAND_NAME,
    VPN_CONNECTIONS,
} from '@proton/shared/lib/constants';
import {
    hasMailPro,
    hasMail,
    hasDrive,
    hasVPN,
    isTrial,
    getHasLegacyPlans,
} from '@proton/shared/lib/helpers/subscription';
import { Plan, Subscription, UserModel, VPNCountries, VPNServers } from '@proton/shared/lib/interfaces';
import { getAppName } from '@proton/shared/lib/apps/helper';
import humanSize from '@proton/shared/lib/helpers/humanSize';

import { getPlusServers } from '@proton/shared/lib/vpn/features';
import { StrippedList, StrippedItem, Button, Price, IconName } from '../../../components';
import { useConfig } from '../../../hooks';
import { OpenSubscriptionModalCallback } from './SubscriptionModalProvider';
import { SUBSCRIPTION_STEPS } from './constants';

interface Item {
    icon: IconName;
    text: string;
}

interface Props {
    subscription?: Subscription;
    plans: Plan[];
    vpnCountries?: VPNCountries;
    vpnServers?: VPNServers;
    user: UserModel;
    openSubscriptionModal: OpenSubscriptionModalCallback;
}

const getHighSpeedVPN = (connections: number) => {
    return c('new_plans: attribute').ngettext(
        msgid`Get ${connections} high-speed VPN connection`,
        `Get ${connections} high-speed VPN connections`,
        connections
    );
};

const getUpgradeText = (planName: string) => {
    return c('new_plans: Title').t`Upgrade to ${planName}`;
};

const UpsellPanel = ({ subscription, plans, vpnServers, vpnCountries, user, openSubscriptionModal }: Props) => {
    const { APP_NAME } = useConfig();
    const isVpnApp = APP_NAME === APPS.PROTONVPN_SETTINGS;

    if (!user.canPay || !subscription) {
        return null;
    }

    if (getHasLegacyPlans(subscription)) {
        return null;
    }

    // Trial upsell
    if (isTrial(subscription)) {
        const mailPlanName = PLAN_NAMES[PLANS.MAIL];
        const formattedTrialExpirationDate = format(subscription.PeriodEnd, 'MMMM d, y');
        const calendarAppName = getAppName(APPS.PROTONCALENDAR);
        const handleUpgrade = () =>
            openSubscriptionModal({
                plan: PLANS.MAIL,
                step: SUBSCRIPTION_STEPS.CHECKOUT,
                disablePlanSelection: true,
            });
        const handleExplorePlans = () =>
            openSubscriptionModal({
                step: SUBSCRIPTION_STEPS.PLAN_SELECTION,
            });
        const items: Item[] = [
            {
                icon: 'checkmark',
                text: c('new_plans: Upsell attribute').t`15 GB total storage`,
            },
            {
                icon: 'checkmark',
                text: c('new_plans: Upsell attribute').t`10 email addresses/aliases`,
            },
            {
                icon: 'checkmark',
                text: c('new_plans: Upsell attribute').t`Unlimited folders, labels, and filters`,
            },
            {
                icon: 'checkmark',
                text: c('new_plans: Upsell attribute').t`Unlimited messages`,
            },
            {
                icon: 'checkmark',
                text: c('new_plans: Upsell attribute').t`Support for 1 custom email`,
            },
            {
                icon: 'checkmark',
                text: c('new_plans: Upsell attribute').t`Priority support`,
            },
            {
                icon: 'checkmark',
                text: calendarAppName,
            },
        ];
        return (
            <div className="border rounded px2 py1-5 pt0-5">
                <h3>
                    <strong>{c('new_plans: Title').t`${mailPlanName} Trial`}</strong>
                </h3>
                <h4>{c('new_plans: Info').t`Your trial ends ${formattedTrialExpirationDate}`}</h4>
                <p className="color-weak">{c('new_plans: Info')
                    .t`To continue to use Proton Mail with premium features, choose your subscription and payment options.`}</p>
                <p className="color-weak">{c('new_plans: Info')
                    .t`Otherwise access to your account will be limited, and your account will eventually be disabled.`}</p>
                <StrippedList>
                    {items.map((item) => {
                        return (
                            <StrippedItem key={item.text} icon={item.icon}>
                                {item.text}
                            </StrippedItem>
                        );
                    })}
                </StrippedList>
                <Button onClick={handleUpgrade} size="large" color="norm" shape="solid" fullWidth>{c(
                    'new_plans: Action'
                ).t`Upgrade now`}</Button>
                <Button onClick={handleExplorePlans} size="large" color="norm" shape="ghost" fullWidth>{c(
                    'new_plans: Action'
                ).t`Explore all ${BRAND_NAME} plans`}</Button>
            </div>
        );
    }

    const cycle = CYCLE.TWO_YEARS;

    const vpnPlanName = PLAN_NAMES[PLANS.VPN];
    const vpnPlan = plans.find(({ Name }) => Name === PLANS.VPN);
    // VPN app only upsell
    if (user.isFree && isVpnApp && vpnPlan) {
        const plan = vpnPlan;
        const price = (
            <Price key="plan-price" currency={DEFAULT_CURRENCY} suffix={c('new_plans: Plan frequency').t`/month`}>
                {(plan.Pricing[cycle] || 0) / cycle}
            </Price>
        );
        const handleUpgrade = () =>
            openSubscriptionModal({
                cycle,
                plan: PLANS.VPN,
                step: SUBSCRIPTION_STEPS.CHECKOUT,
                disablePlanSelection: true,
            });
        const maxVpn = 10;
        const items: Item[] = [
            {
                icon: 'checkmark',
                text: c('new_plans: attribute').ngettext(
                    msgid`High-speed VPN on ${maxVpn} device`,
                    `High-speed VPN on ${maxVpn} devices`,
                    maxVpn
                ),
            },
            {
                icon: 'checkmark',
                text: c('new_plans: attribute').t`Built-in ad blocker (NetShield)`,
            },
            {
                icon: 'checkmark',
                text: c('new_plans: attribute').t`Access to streaming services globally`,
            },
            {
                icon: 'checkmark',
                text: getPlusServers(vpnServers?.[PLANS.VPNPLUS], vpnCountries?.[PLANS.VPNPLUS].count),
            },
        ];
        return (
            <div className="border rounded px2 py1-5 pt0-5">
                <h3>
                    <strong>{getUpgradeText(vpnPlanName)}</strong>
                </h3>
                <p>{c('new_plans: Info')
                    .t`The dedicated VPN solution that provides secure, unrestricted, high-speed access to the internet.`}</p>
                <StrippedList>
                    {items.map((item) => {
                        return <StrippedItem icon={item.icon}>{item.text}</StrippedItem>;
                    })}
                </StrippedList>
                <Button onClick={handleUpgrade} size="large" color="norm" shape="solid" fullWidth>{c(
                    'new_plans: Action'
                ).jt`From ${price}`}</Button>
            </div>
        );
    }

    const bundlePlanName = PLAN_NAMES[PLANS.BUNDLE];
    const bundlePlan = plans.find(({ Name }) => Name === PLANS.BUNDLE);
    const bundleStorage = humanSize(bundlePlan?.MaxSpace ?? 500, undefined, undefined, 0);
    // Bundle upsell
    if ((user.isFree || hasMail(subscription) || hasDrive(subscription) || hasVPN(subscription)) && bundlePlan) {
        const plan = bundlePlan;
        const price = (
            <Price
                key="plan-price"
                currency={subscription?.Currency || DEFAULT_CURRENCY}
                suffix={c('new_plans: Plan frequency').t`/month`}
            >
                {(plan.Pricing[cycle] || 0) / cycle}
            </Price>
        );
        const handleUpgrade = () =>
            openSubscriptionModal({
                cycle,
                plan: PLANS.BUNDLE,
                step: SUBSCRIPTION_STEPS.CHECKOUT,
                disablePlanSelection: true,
            });
        const items: Item[] = [
            {
                icon: 'checkmark',
                text: c('new_plans: Upsell attribute').t`Boost your storage space to ${bundleStorage} total`,
            },
            {
                icon: 'checkmark',
                text: c('new_plans: Upsell attribute')
                    .t`Add more personalization with 15 email addresses and support for 3 custom email domains`,
            },
            {
                icon: 'checkmark',
                text: c('new_plans: Upsell attribute').t`Create up to 20 personal calendars`,
            },
            {
                icon: 'checkmark',
                text: getHighSpeedVPN(VPN_CONNECTIONS),
            },
            {
                icon: 'checkmark',
                text: c('new_plans: Upsell attribute').t`Access advanced VPN features`,
            },
        ];
        return (
            <div className="border rounded px2 py1-5 pt0-5">
                <h3>
                    <strong>{getUpgradeText(bundlePlanName)}</strong>
                </h3>
                <p className="color-weak">{c('new_plans: Info')
                    .t`Upgrade to the ultimate privacy pack and access all premium Proton services.`}</p>
                <StrippedList>
                    {items.map((item) => {
                        return (
                            <StrippedItem key={item.text} icon={item.icon}>
                                {item.text}
                            </StrippedItem>
                        );
                    })}
                </StrippedList>
                <Button onClick={handleUpgrade} size="large" color="norm" shape="solid" fullWidth>{c(
                    'new_plans: Action'
                ).jt`From ${price}`}</Button>
            </div>
        );
    }

    const businessPlanName = PLAN_NAMES[PLANS.BUNDLE_PRO];
    const businessPlan = plans.find(({ Name }) => Name === PLANS.BUNDLE_PRO);
    const businessStorage = humanSize(businessPlan?.MaxSpace ?? 500, undefined, undefined, 0);
    // Mail pro upsell
    if (hasMailPro(subscription) && businessPlan) {
        const plan = businessPlan;
        const price = (
            <Price
                key="plan-price"
                currency={subscription?.Currency || DEFAULT_CURRENCY}
                suffix={c('new_plans: Plan frequency').t`/month`}
            >
                {(plan.Pricing[cycle] || 0) / cycle}
            </Price>
        );
        const handleUpgrade = () =>
            openSubscriptionModal({
                cycle,
                plan: PLANS.BUNDLE_PRO,
                step: SUBSCRIPTION_STEPS.CUSTOMIZATION,
                disablePlanSelection: true,
            });
        const items: Item[] = [
            {
                icon: 'checkmark',
                text: c('new_plans: Upsell attribute').t`Boost your storage space to ${businessStorage} per user`,
            },
            {
                icon: 'checkmark',
                text: c('new_plans: Upsell attribute').t`Get 5 additional email addresses`,
            },
            {
                icon: 'checkmark',
                text: c('new_plans: Upsell attribute').t`Cover more ground with support for 10 custom email domains`,
            },
            {
                icon: 'checkmark',
                text: getHighSpeedVPN(VPN_CONNECTIONS),
            },
        ];
        return (
            <div className="border rounded px2 py1-5 pt0-5">
                <h3>
                    <strong>{getUpgradeText(businessPlanName)}</strong>
                </h3>
                <p className="color-weak">{c('new_plans: Info')
                    .t`Upgrade to the business pack with access to all premium Proton services.`}</p>
                <StrippedList>
                    {items.map((item) => {
                        return (
                            <StrippedItem key={item.text} icon={item.icon}>
                                {item.text}
                            </StrippedItem>
                        );
                    })}
                </StrippedList>
                <Button onClick={handleUpgrade} size="large" color="norm" shape="solid" fullWidth>{c(
                    'new_plans: Action'
                ).jt`From ${price} per user`}</Button>
            </div>
        );
    }

    return null;
};

export default UpsellPanel;
