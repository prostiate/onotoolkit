import { defineStore } from "pinia";
import type { IndentOption, OutputFormat } from "~/utils/json";
import { formatJson, indentValue, minifyJson, parseJson, sortKeysDeep } from "~/utils/json";

const SAMPLE = `{
  "name": "Ono Toolkit",
  "private": true,
  "tools": ["compress-pdf", "jwt-debugger"],
  "stars": 42,
  "author": { "name": "Irfan", "role": "maker" }
}`;

interface JsonState {
  input: string;
  output: string;
  format: OutputFormat;
  indent: IndentOption;
  error: string | null;
  valid: boolean | null;
}

export const useJsonStore = defineStore("json", {
  state: (): JsonState => ({
    input: SAMPLE,
    output: "",
    format: "json",
    indent: 2,
    error: null,
    valid: null
  }),
  actions: {
    fail(error: unknown): void {
      this.error = error instanceof Error ? error.message : "Something went wrong.";
      this.valid = false;
    },
    checkValid(): void {
      const result = parseJson(this.input);
      this.valid = result.ok;
      this.error = result.ok ? null : (result.error ?? "Invalid JSON.");
    },
    setInput(value: string): void {
      this.input = value;
      this.checkValid();
    },
    setIndent(indent: IndentOption): void {
      this.indent = indent;
      if (this.format === "json" && this.output) this.beautify();
    },
    beautify(): void {
      try {
        this.output = formatJson(this.input, this.indent);
        this.format = "json";
        this.error = null;
        this.valid = true;
      } catch (error) {
        this.fail(error);
      }
    },
    minify(): void {
      try {
        this.output = minifyJson(this.input);
        this.format = "json";
        this.error = null;
        this.valid = true;
      } catch (error) {
        this.fail(error);
      }
    },
    sortKeys(): void {
      const result = parseJson(this.input);
      if (!result.ok) {
        this.fail(new Error(result.error));
        return;
      }
      this.input = JSON.stringify(sortKeysDeep(result.value), null, indentValue(this.indent));
      this.beautify();
    },
    async convert(format: OutputFormat): Promise<void> {
      const result = parseJson(this.input);
      if (!result.ok) {
        this.fail(new Error(result.error));
        return;
      }
      this.valid = true;
      this.error = null;
      if (format === "json") {
        this.beautify();
        return;
      }
      const { toYaml, toCsv, toXml } = useJsonConvert();
      try {
        this.output =
          format === "yaml"
            ? await toYaml(result.value)
            : format === "csv"
              ? await toCsv(result.value)
              : await toXml(result.value);
        this.format = format;
      } catch (error) {
        this.fail(error);
      }
    },
    loadSample(): void {
      this.setInput(SAMPLE);
      this.output = "";
    },
    clear(): void {
      this.input = "";
      this.output = "";
      this.error = null;
      this.valid = null;
      this.format = "json";
    }
  }
});
