import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Globe2,
  Languages,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { useToast } from "../lib/store";
import "./translate.css";

const languages = [
  ["en", "English"],
  ["hi", "Hindi"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["de", "German"],
  ["ja", "Japanese"],
  ["ko", "Korean"],
  ["ar", "Arabic"],
  ["pt", "Portuguese"],
  ["zh", "Chinese"],
  ["ru", "Russian"],
  ["it", "Italian"],
  ["bn", "Bengali"],
  ["ur", "Urdu"],
  ["tr", "Turkish"],
  ["nl", "Dutch"],
  ["ta", "Tamil"],
  ["te", "Telugu"],
  ["mr", "Marathi"],
] as const;
const maxLength = 3000;

export default function TranslatePage() {
  const [from, setFrom] = useState("auto");
  const [to, setTo] = useState("en");
  const [text, setText] = useState("");
  const [translation, setTranslation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const output = useRef<HTMLTextAreaElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToast();

  useEffect(
    () => () => {
      controller.current?.abort();
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
    },
    [],
  );
  function invalidate() {
    setTranslation("");
    setError("");
    setCopied(false);
  }
  function changeLanguages(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    invalidate();
  }

  async function translate(event?: FormEvent) {
    event?.preventDefault();
    if (loading) return;
    if (!text.trim()) {
      setError("Write a little something to translate first.");
      input.current?.focus();
      return;
    }
    if (text.length > maxLength) {
      setError("Keep your text to 3,000 characters or fewer.");
      return;
    }
    controller.current?.abort();
    const requestController = new AbortController();
    controller.current = requestController;
    setLoading(true);
    setError("");
    setTranslation("");
    setCopied(false);
    try {
      const response = await fetch(
        `/api/translate?${new URLSearchParams({ from, to, text })}`,
        { signal: requestController.signal },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Translation is unavailable right now. Please try again.",
        );
      if (
        typeof data?.translated_text !== "string" ||
        !data.translated_text.trim()
      )
        throw new Error("No translation was returned. Please try again.");
      setTranslation(data.translated_text);
    } catch (failure) {
      if (failure instanceof Error && failure.name !== "AbortError")
        setError(failure.message);
    } finally {
      if (!requestController.signal.aborted) setLoading(false);
    }
  }

  function swap() {
    if (from === "auto" || loading) return;
    const previousFrom = from;
    setFrom(to);
    setTo(previousFrom);
    if (translation) setText(translation.slice(0, maxLength));
    invalidate();
    input.current?.focus();
  }

  async function copy() {
    if (!translation) return;
    try {
      if (navigator.clipboard?.writeText)
        await navigator.clipboard.writeText(translation);
      else {
        output.current?.focus();
        output.current?.select();
        if (!document.execCommand("copy"))
          throw new Error("Clipboard unavailable");
      }
      setCopied(true);
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => setCopied(false), 2500);
      toast("Translation copied");
    } catch {
      output.current?.focus();
      output.current?.select();
      toast("Select and copy the translation manually");
    }
  }

  return (
    <div className="translate-page">
      <header className="translate-header">
        <div>
          <div className="eyebrow">
            <Languages size={12} /> POKE TOOLS · TRANSLATE
          </div>
          <h1>
            Good words travel<span>.</span>
          </h1>
          <p>A thought, a lyric, a little curiosity. Let it find its way.</p>
        </div>
        <span className="translate-header-mark" aria-hidden="true">
          <Globe2 size={35} strokeWidth={1.15} />
          <Sparkles size={13} />
        </span>
      </header>
      <form
        className="translate-form"
        onSubmit={(event) => {
          void translate(event);
        }}
      >
        <div className="translate-workspace">
          <section className="translate-panel glass" aria-label="Source text">
            <div className="translate-panel-header">
              <label htmlFor="translate-source-language">FROM</label>
              <div className="translate-language-select">
                <select
                  id="translate-source-language"
                  value={from}
                  disabled={loading}
                  onChange={(event) => changeLanguages(event.target.value, to)}
                >
                  <option value="auto">Detect language</option>
                  {languages.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} />
              </div>
            </div>
            <div className="translate-textarea-wrap">
              <textarea
                ref={input}
                id="translate-source-text"
                aria-label="Text to translate"
                value={text}
                maxLength={maxLength}
                disabled={loading}
                dir="auto"
                placeholder="What would you like to say?"
                spellCheck={false}
                onChange={(event) => {
                  setText(event.target.value);
                  invalidate();
                }}
                onKeyDown={(event) => {
                  if (
                    (event.ctrlKey || event.metaKey) &&
                    event.key === "Enter"
                  ) {
                    event.preventDefault();
                    void translate();
                  }
                }}
              />
              {text && !loading && (
                <button
                  type="button"
                  className="icon-button translate-clear"
                  aria-label="Clear source text"
                  title="Clear text"
                  onClick={() => {
                    setText("");
                    invalidate();
                    input.current?.focus();
                  }}
                >
                  <X size={17} />
                </button>
              )}
            </div>
            <footer className="translate-panel-footer">
              <span className="translate-input-hint">
                Make a little connection.
              </span>
              <span
                className={
                  text.length === maxLength ? "translate-at-limit" : ""
                }
              >
                {text.length.toLocaleString()} / 3,000
              </span>
            </footer>
          </section>
          <button
            type="button"
            className="translate-swap glass"
            aria-label="Swap source and target languages"
            title={
              from === "auto"
                ? "Choose a source language to swap"
                : "Swap languages"
            }
            disabled={from === "auto" || loading}
            onClick={swap}
          >
            <ArrowLeftRight size={17} />
          </button>
          <section
            className={`translate-panel translate-result-panel glass ${loading ? "is-translating" : ""}`}
            aria-label="Translation"
          >
            <div className="translate-panel-header">
              <label htmlFor="translate-target-language">TO</label>
              <div className="translate-language-select">
                <select
                  id="translate-target-language"
                  value={to}
                  disabled={loading}
                  onChange={(event) =>
                    changeLanguages(from, event.target.value)
                  }
                >
                  {languages.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} />
              </div>
              <span className="translate-output-indicator">
                <i />
                {translation ? "TRANSLATED" : "YOUR TRANSLATION"}
              </span>
            </div>
            <div className="translate-textarea-wrap">
              <textarea
                ref={output}
                id="translate-result-text"
                aria-label="Translated text"
                value={translation}
                dir="auto"
                readOnly
                placeholder={
                  loading
                    ? "Finding the right words…"
                    : "Your translation will appear here."
                }
              />
              {loading && (
                <div className="translate-loading-overlay" role="status">
                  <span>
                    <LoaderCircle size={25} />
                    <span>Finding the right words…</span>
                  </span>
                </div>
              )}
            </div>
            <footer className="translate-panel-footer">
              <span>
                {translation
                  ? `${translation.length.toLocaleString()} characters`
                  : "A different language. The same idea."}
              </span>
              <button
                type="button"
                className={`translate-copy ${copied ? "is-copied" : ""}`}
                aria-label={copied ? "Translation copied" : "Copy translation"}
                onClick={() => {
                  void copy();
                }}
                disabled={!translation || loading}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </footer>
          </section>
        </div>
        {error && (
          <div className="translate-error" role="alert">
            <AlertCircle size={18} />
            <div>
              <strong>A little lost in translation.</strong>
              <p>{error}</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="button button-secondary"
            >
              <RefreshCw size={13} />
              Try again
            </button>
          </div>
        )}
        <div className="translate-submit-row">
          <p>
            <span className="translate-provider-dot" />
            Powered by SimplyTranslate
            <span className="translate-keyboard-hint">Ctrl / ⌘ + Enter</span>
          </p>
          <div>
            {loading && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  controller.current?.abort();
                  setLoading(false);
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="button button-primary translate-submit"
              disabled={loading || !text.trim()}
            >
              {loading ? (
                <>
                  <LoaderCircle
                    size={16}
                    className="translate-button-spinner"
                  />
                  Translating…
                </>
              ) : (
                <>
                  Translate
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
      <section className="translate-shortcuts" aria-label="Language shortcuts">
        <span>TAKE A SHORTCUT</span>
        <div>
          {[
            ["en", "hi", "English → Hindi"],
            ["en", "es", "English → Spanish"],
            ["en", "ja", "English → Japanese"],
          ].map(([source, target, label]) => (
            <button
              type="button"
              disabled={loading}
              key={target}
              onClick={() => changeLanguages(source, target)}
              className={from === source && to === target ? "is-active" : ""}
            >
              {label}
              <ArrowRight size={12} />
            </button>
          ))}
        </div>
      </section>
      <footer className="translate-privacy-note">
        <Globe2 size={14} />
        <p>
          Text is sent to SimplyTranslate only when you translate. Translations
          may miss context; give important words a second look.
        </p>
      </footer>
      <span
        className="translate-result-status"
        role="status"
        aria-live="polite"
      >
        {translation ? "Translation complete." : ""}
      </span>
    </div>
  );
}
