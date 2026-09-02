import { BookText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { MistakeRecord, VocabularyEntry } from "@/lib/types";
import { Badge, Empty, Intro } from "./ui";

interface VocabularyGroup {
  word: string;
  translations: string[];
  occurrences: Array<{ id: string; source: string; question: string; module: string }>;
}

function groupVocabulary(items: MistakeRecord[]): VocabularyGroup[] {
  const groups = new Map<string, VocabularyGroup>();
  for (const item of items) {
    for (const entry of (item.vocabulary ?? []) as VocabularyEntry[]) {
      const word = entry.word.trim();
      const translation = entry.translation.trim();
      if (!word || !translation) continue;
      const key = word.toLocaleLowerCase();
      const group = groups.get(key) ?? { word, translations: [], occurrences: [] };
      if (!group.translations.includes(translation)) group.translations.push(translation);
      if (!group.occurrences.some((occurrence) => occurrence.id === item.id)) {
        group.occurrences.push({ id: item.id, source: item.source_label, question: item.question_text, module: item.module });
      }
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
    <Intro kicker="VOCABULARY BOOK" title="把真正阻碍你做题的词，集中成可复习的清单。" body="生词由你在每道错题中填写；同一个单词会自动合并，并保留它出现过的题目。" />
    <div className="card vocabulary-summary"><div><strong>{groups.length}</strong><span>个独立生词</span></div><div><strong>{groups.reduce((total, group) => total + group.occurrences.length, 0)}</strong><span>次错题关联</span></div></div>
    <div className="card vocabulary-filter"><Search /><input aria-label="搜索生词" placeholder="搜索英文单词或中文释义…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
    {!visible.length ? <Empty icon={BookText} title="还没有生词" body="进入错题本，点击任意题目的“修改”，填写生词和中文释义后，这里会自动汇总。" /> : <div className="vocabulary-grid">{visible.map((group) => <article className="card vocabulary-card" key={group.word.toLocaleLowerCase()}><div className="vocabulary-card-head"><h3>{group.word}</h3><Badge>{group.occurrences.length} 道题</Badge></div><div className="vocabulary-translations">{group.translations.map((translation) => <span key={translation}>{translation}</span>)}</div><details><summary>查看关联错题</summary><ul>{group.occurrences.map((occurrence) => <li key={occurrence.id}><Badge tone={occurrence.module === "reading" ? "green" : "orange"}>{occurrence.module === "reading" ? "阅读" : "听力"}</Badge><span>{occurrence.source}</span><small>{occurrence.question}</small></li>)}</ul></details></article>)}</div>}
  </section>;
}
