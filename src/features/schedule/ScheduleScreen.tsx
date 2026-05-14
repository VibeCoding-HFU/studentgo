import { ScheduleView } from './ScheduleView';
import { useScheduleController } from './useScheduleController';

export function ScheduleScreen() {
  const controller = useScheduleController();

  return <ScheduleView controller={controller} />;
}
