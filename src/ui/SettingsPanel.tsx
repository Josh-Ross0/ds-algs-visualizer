import type { Settings } from './settings';

type Props = { settings: Settings; questionTypes: { type: string; label: string }[]; onChange(s: Settings): void };

export function SettingsPanel({ settings, questionTypes, onChange }: Props) {
  const toggleType = (type: string) => {
    const off = settings.disabledTypes.includes(type);
    onChange({
      ...settings,
      disabledTypes: off ? settings.disabledTypes.filter((t) => t !== type) : [...settings.disabledTypes, type],
    });
  };
  return (
    <fieldset className="panel settings">
      <legend>Questions</legend>
      <label>
        <input type="checkbox" checked={settings.predict} onChange={() => onChange({ ...settings, predict: !settings.predict })} />
        Predict mode
      </label>
      {questionTypes.map((q) => (
        <label key={q.type} className="indent">
          <input
            type="checkbox"
            disabled={!settings.predict}
            checked={!settings.disabledTypes.includes(q.type)}
            onChange={() => toggleType(q.type)}
          />
          {q.label}
        </label>
      ))}
    </fieldset>
  );
}
