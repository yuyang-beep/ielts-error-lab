import { BookText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { MistakeRecord, VocabularyEntry } from "@/lib/types";
import { Empty, Intro } from "./ui";

interface VocabularyGroup {
  word: string;
  translations: string[];
}

function groupVocabulary(items: MistakeRecord[]): VocabularyGroup[] {
  const groups = new Map<string, VocabularyGroup>();
  for (const item of items) {
    for (const entry of (item.vocabulary ?? []) as VocabularyEntry[]) {
      const word = entry.word.trim();
      const translation = entry.translation.trim();
      if (!word || !translation) continue;
      const key = word.toLocaleLowerCase();
      const group = groups.get(key) ?? { word, translations: [] };
      if (!group.translations.includes(translation)) group.translations.push(translation);
      groups.set(key, group);
    }
  }
  return [...groups.values()].sort((a, b) => a.word.localeCompare(b.word));
}

export function VocabularyBook({ items }: { items: MistakeRecord[] }) {
  const [search, setSearch] = useState("");
  const groups = useMemo(() => groupVocabulary(items), [items]);
  const visible = groups.filter((group) => `${group.word} ${group.translations.join(" ")}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <section>
    <Intro kicker="VOCABULARY BOOK" title="把真正阻碍你做题的词，集中成可复习的清单。" body="生词本只保留你填写的英文单词和中文释义。" />
    <div className="card vocabulary-filter"><Search /><input aria-label="搜索生词" placeholder="搜索英文单词或中文释义…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
    {!visible.length ? <Empty icon={BookText} title="还没有生词" body="在待确认分析中填写生词及中文释义，确认错题后会自动汇总到这里。" /> : <div className="vocabulary-grid">{visible.map((group) => <article className="card vocabulary-card" key={group.word.toLocaleLowerCase()}><h3>{group.word}</h3><div className="vocabulary-translations">{group.translations.map((translation) => <span key={translation}>{translation}</span>)}</div></article>)}</div>}
  </section>;
}