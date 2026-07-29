<script setup lang="ts">
type TokenClass = "key" | "string" | "number" | "keyword" | "plain";
interface Token {
  text: string;
  cls: TokenClass;
}

const props = defineProps<{ value: Record<string, unknown> }>();

const classMap: Record<TokenClass, string> = {
  key: "text-sky-700 dark:text-sky-300",
  string: "text-emerald-600 dark:text-emerald-400",
  number: "text-amber-600 dark:text-amber-400",
  keyword: "text-fuchsia-600 dark:text-fuchsia-400",
  plain: "text-muted"
};

function tokenize(json: string): Token[] {
  const tokens: Token[] = [];
  const pattern =
    /"(?:\\.|[^"\\])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
  let last = 0;
  for (const match of json.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) tokens.push({ text: json.slice(last, index), cls: "plain" });
    const raw = match[0];
    let cls: TokenClass;
    if (raw.startsWith('"')) cls = match[1] !== undefined ? "key" : "string";
    else if (raw === "true" || raw === "false" || raw === "null") cls = "keyword";
    else cls = "number";
    tokens.push({ text: raw, cls });
    last = index + raw.length;
  }
  if (last < json.length) tokens.push({ text: json.slice(last), cls: "plain" });
  return tokens;
}

const tokens = computed<Token[]>(() => tokenize(JSON.stringify(props.value, null, 2)));
</script>

<template>
  <pre
    class="bg-muted overflow-auto rounded-lg p-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap"
  ><code><span v-for="(token, index) in tokens" :key="index" :class="classMap[token.cls]">{{ token.text }}</span></code></pre>
</template>
