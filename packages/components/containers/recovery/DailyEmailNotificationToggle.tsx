import { Toggle } from '../../components';
import { useLoading } from '../../hooks';

interface DailyEmailNotificationToggleProps {
    id: string;
    isEnabled: boolean;
    canEnable: boolean;
    className?: string;
    onChange: () => Promise<void>;
}

const DailyEmailNotificationToggle = ({
    id,
    isEnabled,
    canEnable,
    className,
    onChange,
}: DailyEmailNotificationToggleProps) => {
    const [isNotifyEmailApiCallLoading, withLoading] = useLoading();

    return (
        <Toggle
            id={id}
            className={className}
            loading={isNotifyEmailApiCallLoading}
            checked={isEnabled}
            disabled={!canEnable}
            onChange={() => withLoading(onChange())}
        />
    );
};

export default DailyEmailNotificationToggle;
