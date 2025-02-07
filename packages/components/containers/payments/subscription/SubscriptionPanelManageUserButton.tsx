import { c } from 'ttag';

import { Button, ButtonLike } from '@proton/atoms/Button';
import { AppLink, SettingsLink } from '@proton/components/components';
import { useConfig, useOrganization, useUser } from '@proton/components/hooks';
import { APPS } from '@proton/shared/lib/constants';
import { hasOrganizationSetup, hasOrganizationSetupWithKeys } from '@proton/shared/lib/helpers/organization';
import { UserType } from '@proton/shared/lib/interfaces';

const SubscriptionPanelManageUserButton = () => {
    const [user] = useUser();
    const [organization] = useOrganization();
    const { APP_NAME } = useConfig();
    const isAdmin = user.isAdmin && !user.isSubUser && user.Type !== UserType.EXTERNAL;

    if (!isAdmin || !(hasOrganizationSetup(organization) || hasOrganizationSetupWithKeys(organization))) {
        return null;
    }

    if (APP_NAME === APPS.PROTONVPN_SETTINGS) {
        return (
            <AppLink to="/mail/users-addresses" toApp={APPS.PROTONACCOUNT} target="_blank">
                <Button className="mb-2" color="norm" size="large" fullWidth>{c('familyOffer_2023:Family plan')
                    .t`Manage user accounts`}</Button>
            </AppLink>
        );
    }

    return (
        <ButtonLike
            as={SettingsLink}
            className="mb-2"
            color="norm"
            path="/users-addresses"
            size="large"
            fullWidth
        >{c('familyOffer_2023:Family plan').t`Manage user accounts`}</ButtonLike>
    );
};

export default SubscriptionPanelManageUserButton;
