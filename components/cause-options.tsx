import { CAUSE_GROUPS, CAUSES } from "@/lib/taxonomy";

export function CauseOptions({ exclude = [] }: { exclude?: string[] }) {
  return <>
    {Object.entries(CAUSE_GROUPS).map(([group, codes]) => <optgroup label={group} key={group}>
      {codes.filter((code) => !exclude.includes(code)).map((code) => <option value={code} key={code}>{code} · {CAUSES[code as keyof typeof CAUSES]}</option>)}
    </optgroup>)}
  </>;
}
