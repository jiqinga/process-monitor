import { reactive } from 'vue';
import { isRunCommand, isStartProcess, type Action, type Rule } from '@/types';

/**
 * Owns the boolean toggles + per-action sub-data for a rule (Kill/Restart/Run/Notify/Log).
 *
 * - Initialises `actionFlags` from `initialRule.actions` when present.
 * - Exposes `buildActions()` which serialises the flags back into the `Action[]`
 *   shape the backend expects.
 *
 * Kept as a composable (not a util) because the state is reactive and shared
 * with the template; pulling it out keeps the modal file focused on layout.
 */
export function useActionFlags(
  initialRule: Rule | null | undefined,
  t: (key: string) => string,
) {
  const actionFlags = reactive({
    killProcess: false,
    startProcess: false,
    startCmd: '',
    runCommand: false,
    commandSteps: [{ cmd: '', delayMs: 0 }] as { cmd: string; delayMs: number }[],
    showNotification: false,
    writeLog: true,
  });

  if (initialRule) {
    for (const a of initialRule.actions) {
      if (a === 'KillProcess') actionFlags.killProcess = true;
      else if (a === 'WriteLog') actionFlags.writeLog = true;
      else if (typeof a === 'object') {
        if (isStartProcess(a)) {
          actionFlags.startProcess = true;
          actionFlags.startCmd = a.StartProcess.cmd || '';
        }
        if (isRunCommand(a)) {
          actionFlags.runCommand = true;
          const steps = a.RunCommand.steps || [];
          actionFlags.commandSteps = steps.map((s) => ({
            cmd: s.cmd,
            delayMs: s.delay_ms || 0,
          }));
          if (actionFlags.commandSteps.length === 0)
            actionFlags.commandSteps = [{ cmd: '', delayMs: 0 }];
        }
        if ('ShowNotification' in a) actionFlags.showNotification = true;
      }
    }
  }

  function buildActions(): Action[] {
    const actions: Action[] = [];
    if (actionFlags.killProcess) actions.push('KillProcess');
    if (actionFlags.startProcess) actions.push({ StartProcess: { cmd: actionFlags.startCmd } });
    if (actionFlags.runCommand)
      actions.push({
        RunCommand: {
          steps: actionFlags.commandSteps
            .filter((s) => s.cmd.trim())
            .map((s) => ({ cmd: s.cmd, delay_ms: s.delayMs })),
        },
      });
    if (actionFlags.showNotification)
      actions.push({
        ShowNotification: {
          title: t('rules.defaultNotificationTitle'),
          body: t('rules.defaultNotificationBody'),
        },
      });
    if (actionFlags.writeLog) actions.push('WriteLog');
    return actions;
  }

  return { actionFlags, buildActions };
}
