import { Command } from 'commander';

export const addCmd = (
  c: Command,
  name: string,
  description: string,
  action: (...args: any[]) => any,
  options?: Array<{
    flags: string;
    description: string;
    defaultValue?: any;
  }>
) => {
  const cmd = c.command(name).description(description).action(action);

  if (options) {
    for (const { flags, description, defaultValue } of options) {
      // NOTE: There is a hack in the code to make this work because default value can be false or null
      if (defaultValue !== undefined) {
        if (defaultValue === null) {
          cmd.option(flags, description);
        } else {
          cmd.option(flags, description, defaultValue);
        }
      } else {
        cmd.requiredOption(flags, description);
      }
    }
  }

  return cmd;
};
