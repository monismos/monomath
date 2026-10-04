import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { philosophy } from '../core/philosophy/repository';
import {
  cloneLesson,
  exportLessons,
  lessonMarkdown,
  newDraft,
  parseLessonImport,
  validLesson,
} from '../core/philosophy/types';
import type { Lesson, LessonDraft, LessonExport, Reflection } from '../core/philosophy/types';
import { journalDraft, journalReflection } from '../core/philosophy/journal';
import { safeMarkdown } from '../core/philosophy/markdown';
import { useLesson } from '../core/scene/store';
import { Icon } from './Icon';
import styles from './Philosophy.module.css';
type Form = Omit<LessonDraft, 'tags' | 'references'> & { tagsText: string; referencesText: string };
const formDraft = (form: Form): LessonDraft => {
  const { tagsText, referencesText, ...fields } = form;
  return {
    ...fields,
    tags: [
      ...new Set(
        tagsText
          .split(',')
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
      ),
    ],
    references: referencesText
      .split('\n')
      .map((ref) => ref.trim())
      .filter(Boolean),
  };
};
function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const filename = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'philosophy';
const date = (timestamp: number) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(timestamp);
function remember(id: string) {
  try {
    localStorage.setItem('monomath-philosophy-selection', id);
  } catch {
    /* Selection still works in this session. */
  }
}
function remembered() {
  try {
    return localStorage.getItem('monomath-philosophy-selection') ?? '';
  } catch {
    return '';
  }
}

export default function Philosophy() {
  const snapshot = useSyncExternalStore(philosophy.subscribe, philosophy.getSnapshot);
  const { data, ready, unavailable, error } = snapshot;
  const contextLab = useLesson((state) => state.labId);
  const contextProblem = useLesson((state) => state.problem);
  const [selected, setSelected] = useState('');
  const [editor, setEditor] = useState<LessonDraft | null>(null);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState<'recent' | 'title' | 'oldest'>('recent');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const [importFile, setImportFile] = useState<{ name: string; payload: LessonExport } | null>(
    null,
  );
  const [replaceNewer, setReplaceNewer] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lesson | null>(null);
  const [undo, setUndo] = useState<Lesson | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const restored = useRef(false);
  useEffect(() => {
    void philosophy
      .initialize()
      .catch((cause) =>
        setNotice(cause instanceof Error ? cause.message : 'The workspace could not be loaded.'),
      );
  }, []);
  useEffect(() => {
    if (!ready) return;
    const wanted =
      contextLab === 'philosophy' ? contextProblem : !restored.current ? remembered() : selected;
    restored.current = true;
    if (wanted && wanted !== 'library') {
      const lesson = data.lessons.find((item) => item.id === wanted);
      const draft = data.drafts.find((item) => item.id === wanted);
      if (lesson) {
        setSelected(lesson.id);
        if (editor?.id !== lesson.id) setEditor(null);
      } else if (draft) {
        setEditor((previous) => (previous?.id === draft.id ? previous : cloneLesson(draft)));
        setSelected('');
      } else if (contextLab === 'philosophy' && contextProblem !== selected)
        setNotice('That saved lesson is not in this library. Import its backup to restore it.');
    }
    if (contextLab !== 'philosophy')
      useLesson
        .getState()
        .set({ labId: 'philosophy', problem: wanted || 'library', step: 0, selection: null });
  }, [ready, contextLab, contextProblem, data.lessons, data.drafts, selected, editor?.id]);
  const tags = useMemo(
    () => [...new Set(data.lessons.flatMap((lesson) => lesson.tags))].sort(),
    [data.lessons],
  );
  const shown = useMemo(
    () =>
      data.lessons
        .filter(
          (lesson) =>
            (!tag || lesson.tags.includes(tag)) &&
            `${lesson.title} ${lesson.question} ${lesson.body} ${lesson.author} ${lesson.tags.join(' ')}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          sort === 'title'
            ? a.title.localeCompare(b.title)
            : sort === 'oldest'
              ? a.createdAt - b.createdAt
              : b.updatedAt - a.updatedAt,
        ),
    [data.lessons, query, tag, sort],
  );
  const current = data.lessons.find((lesson) => lesson.id === selected);
  const navigate = (id: string) => {
    setSelected(id);
    setEditor(null);
    remember(id);
    useLesson.getState().set({ labId: 'philosophy', problem: id, step: 0, selection: null });
  };
  const start = async (draft: LessonDraft) => {
    setPending(true);
    try {
      await philosophy.saveDraft(draft);
      setEditor(cloneLesson(draft));
      setSelected(data.lessons.some((lesson) => lesson.id === draft.id) ? draft.id : '');
      useLesson
        .getState()
        .set({ labId: 'philosophy', problem: draft.id, step: 0, selection: null });
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'This draft could not be opened.');
    } finally {
      setPending(false);
    }
  };
  const exportAll = (format: 'json' | 'markdown') =>
    download(
      `monomath-philosophy.${format === 'json' ? 'json' : 'md'}`,
      format === 'json'
        ? JSON.stringify(exportLessons(data.lessons), null, 2)
        : data.lessons.map(lessonMarkdown).join('\n---\n\n'),
      format === 'json' ? 'application/json' : 'text/markdown',
    );
  const readImport = async (file: File) => {
    if (file.size > 5000000) {
      setNotice('This file is too large. Import a lesson export smaller than 5 MB.');
      return;
    }
    try {
      const payload = parseLessonImport(JSON.parse(await file.text()));
      setImportFile({ name: file.name, payload });
      setReplaceNewer(false);
      setNotice('');
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'This file could not be read.');
    }
  };
  const applyImport = async () => {
    if (!importFile) return;
    setPending(true);
    try {
      const result = await philosophy.importLessons(importFile.payload, replaceNewer);
      setNotice(
        `${result.added} added, ${result.replaced} replaced, ${result.skipped} kept. ${result.durable ? 'Saved locally.' : 'Export a backup before leaving.'}`,
      );
      setImportFile(null);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Nothing was imported.');
    } finally {
      setPending(false);
    }
  };
  const remove = async () => {
    if (!deleteTarget) return;
    setPending(true);
    try {
      const lesson = deleteTarget;
      const durable = await philosophy.deleteLesson(lesson.id);
      setUndo(lesson);
      setDeleteTarget(null);
      setEditor(null);
      setSelected('');
      useLesson
        .getState()
        .set({ labId: 'philosophy', problem: 'library', step: 0, selection: null });
      setNotice(
        durable
          ? 'Lesson deleted. You can undo this.'
          : 'Lesson removed for this session. Browser storage is unavailable.',
      );
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'The lesson could not be deleted.');
    } finally {
      setPending(false);
    }
  };
  return (
    <section className={styles.workspace} data-anchor-id="philosophy-workspace">
      <header className={styles.heading}>
        <div>
          <span className={styles.cue}>
            <Icon name="BookOpen" size={17} /> Your own questions, given room
          </span>
          <h1>Philosophy</h1>
          <p>Write lessons in your own voice. Read slowly. Keep your reflections close.</p>
        </div>
        <button
          className={styles.primary}
          disabled={pending || !ready}
          onClick={() => void start(newDraft(data.author))}
        >
          <Icon name="Plus" size={17} /> Add a lesson
        </button>
      </header>
      {error && (
        <p className={styles.warning} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <div className={styles.notice} role="status">
          <span>{notice}</span>
          {undo && (
            <button
              onClick={async () => {
                const lesson = undo;
                setPending(true);
                try {
                  await philosophy.restoreLesson(lesson);
                  setUndo(null);
                  setNotice('Lesson restored.');
                  navigate(lesson.id);
                } catch (cause) {
                  setNotice(cause instanceof Error ? cause.message : 'Undo could not be saved.');
                } finally {
                  setPending(false);
                }
              }}
              disabled={pending}
            >
              Undo delete
            </button>
          )}
          <button
            aria-label="Dismiss message"
            onClick={() => {
              setNotice('');
              setUndo(null);
            }}
          >
            <Icon name="X" size={16} />
          </button>
        </div>
      )}
      {!ready ? (
        <p className={styles.loading} role="status">
          Opening your local library…
        </p>
      ) : (
        <>
          <div className={styles.libraryTools} data-anchor-id="philosophy-library-tools">
            <label className={styles.search}>
              <Icon name="Search" size={17} />
              <span className="sr-only">Search Philosophy lessons</span>
              <input
                type="search"
                placeholder="Find a question or lesson"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label>
              <span className="sr-only">Filter by tag</span>
              <select value={tag} onChange={(event) => setTag(event.target.value)}>
                <option value="">Every tag</option>
                {tags.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Sort Philosophy lessons</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
                <option value="recent">Recently edited</option>
                <option value="title">By title</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
          </div>
          <div className={styles.layout}>
            <aside
              className={styles.library}
              aria-label="Philosophy lesson library"
              data-anchor-id="philosophy-library"
            >
              <div className={styles.libraryCount}>
                {data.lessons.length} {data.lessons.length === 1 ? 'lesson' : 'lessons'}
                <Icon name="BookOpen" size={17} />
              </div>
              {shown.map((lesson) => (
                <article
                  key={lesson.id}
                  data-anchor-id={`philosophy-card-${lesson.id}`}
                  className={`${styles.card} ${selected === lesson.id ? styles.selected : ''}`}
                >
                  <button
                    onClick={() => navigate(lesson.id)}
                    aria-current={selected === lesson.id ? 'page' : undefined}
                  >
                    <h2>{lesson.title}</h2>
                    {lesson.question && <p>{lesson.question}</p>}
                    <span>
                      {lesson.author} · {date(lesson.updatedAt)}
                    </span>
                    {lesson.tags.length > 0 && <small>{lesson.tags.join(', ')}</small>}
                  </button>
                </article>
              ))}
              {!shown.length && data.lessons.length > 0 && (
                <p className={styles.smallEmpty}>
                  No lessons match yet.
                  <button
                    onClick={() => {
                      setQuery('');
                      setTag('');
                    }}
                  >
                    Clear search and filters
                  </button>
                </p>
              )}
              {data.drafts.length > 0 && (
                <section className={styles.drafts} aria-label="Saved lesson drafts">
                  <h2>Work in progress</h2>
                  {data.drafts.map((draft) => (
                    <div key={draft.id}>
                      <button onClick={() => void start(draft)} disabled={pending}>
                        Resume {draft.title.trim() || 'untitled draft'}
                        <small>{date(draft.updatedAt)}</small>
                      </button>
                      <button
                        aria-label={`Discard draft ${draft.title.trim() || 'untitled'}`}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              'Discard this saved draft? Your published lesson stays in the library.',
                            )
                          )
                            return;
                          try {
                            await philosophy.discardDraft(draft.id);
                            if (editor?.id === draft.id) setEditor(null);
                          } catch (cause) {
                            setNotice(
                              cause instanceof Error
                                ? cause.message
                                : 'The draft could not be discarded.',
                            );
                          }
                        }}
                      >
                        <Icon name="Trash2" size={16} />
                      </button>
                    </div>
                  ))}
                </section>
              )}
            </aside>
            <div className={styles.page}>
              {editor ? (
                <LessonEditor
                  key={editor.id}
                  draft={editor}
                  unavailable={unavailable}
                  onSave={(lesson, durable) => {
                    navigate(lesson.id);
                    setNotice(
                      durable
                        ? 'Lesson saved locally.'
                        : 'Lesson ready for this session. Export a backup before leaving.',
                    );
                  }}
                  onClose={() => {
                    setEditor(null);
                    useLesson.getState().set({
                      labId: 'philosophy',
                      problem: selected || 'library',
                      step: 0,
                      selection: null,
                    });
                  }}
                />
              ) : current ? (
                <LessonReader
                  key={current.id}
                  lesson={current}
                  reflection={data.reflections.find((item) => item.lessonId === current.id)}
                  unavailable={unavailable}
                  onEdit={() =>
                    void start(
                      data.drafts.find((item) => item.id === current.id) ?? {
                        ...cloneLesson(current),
                        updatedAt: Math.max(Date.now(), current.updatedAt + 1),
                      },
                    )
                  }
                  onDelete={() => setDeleteTarget(current)}
                />
              ) : (
                <div className={styles.empty} data-anchor-id="philosophy-invitation">
                  <div className={styles.paperMark} aria-hidden="true">
                    ?
                  </div>
                  <h2>
                    {data.lessons.length
                      ? 'Choose a question to spend time with.'
                      : 'A place for the lessons only you can write.'}
                  </h2>
                  <p>
                    {data.lessons.length
                      ? 'Open a lesson from the library, or give a new question a page.'
                      : 'Begin with a question you keep returning to. You can add a lesson, connect its sources, and leave room for your own thinking.'}
                  </p>
                  <button
                    className={styles.primary}
                    onClick={() => void start(newDraft(data.author))}
                    disabled={pending}
                  >
                    <Icon name="Pencil" size={17} /> Write your first{' '}
                    {data.lessons.length ? 'new lesson' : 'lesson'}
                  </button>
                  <span>Everything you write stays on this device until you export it.</span>
                </div>
              )}
            </div>
          </div>
          <footer className={styles.footer} data-anchor-id="philosophy-backups">
            <p>
              <Icon name="Download" size={16} /> Keep a copy of your lessons. Private reflections
              stay on this device.
            </p>
            <div>
              <button onClick={() => exportAll('json')} disabled={!data.lessons.length}>
                Export all JSON
              </button>
              <button onClick={() => exportAll('markdown')} disabled={!data.lessons.length}>
                Export all Markdown
              </button>
              <button onClick={() => input.current?.click()}>
                <Icon name="Upload" size={15} /> Import lessons
              </button>
              <input
                ref={input}
                type="file"
                accept=".json,application/json"
                aria-label="Import Philosophy JSON"
                className={styles.file}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void readImport(file);
                  event.target.value = '';
                }}
              />
            </div>
          </footer>
          {importFile && (
            <section
              className={styles.confirm}
              data-anchor-id="philosophy-import"
              aria-label="Review lesson import"
            >
              <h2>
                Import {importFile.payload.lessons.length} lessons from {importFile.name}?
              </h2>
              <p>
                New ids are added. Existing lessons stay as they are unless you choose the option
                below.
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={replaceNewer}
                  onChange={(event) => setReplaceNewer(event.target.checked)}
                />{' '}
                Replace matching ids only when the imported lesson is newer
              </label>
              <div>
                <button
                  className={styles.primary}
                  onClick={() => void applyImport()}
                  disabled={pending}
                >
                  {pending ? 'Importing…' : 'Import lessons now'}
                </button>
                <button onClick={() => setImportFile(null)} disabled={pending}>
                  Cancel import
                </button>
              </div>
            </section>
          )}
          {deleteTarget && (
            <section
              className={styles.confirm}
              data-anchor-id="philosophy-delete"
              role="alertdialog"
              aria-labelledby="philosophy-delete-title"
              aria-describedby="philosophy-delete-description"
            >
              <h2 id="philosophy-delete-title">Delete “{deleteTarget.title}”?</h2>
              <p id="philosophy-delete-description">
                The lesson leaves your library. You can undo this deletion here; your private
                reflection is kept.
              </p>
              <div>
                <button className={styles.danger} onClick={() => void remove()} disabled={pending}>
                  Delete lesson
                </button>
                <button onClick={() => setDeleteTarget(null)} disabled={pending}>
                  Keep lesson
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </section>
  );
}

function LessonEditor({
  draft,
  unavailable,
  onSave,
  onClose,
}: {
  draft: LessonDraft;
  unavailable: boolean;
  onSave: (lesson: Lesson, durable: boolean) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Form>(() => {
    const { tags, references, ...fields } = draft;
    return { ...fields, tagsText: tags.join(', '), referencesText: references.join('\n') };
  });
  const [status, setStatus] = useState(
    unavailable ? 'Draft kept for this session.' : 'Draft saved locally.',
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const latest = useRef(formDraft(form));
  const finished = useRef(false);
  const update = (key: keyof Form, value: string) => {
    const next = { ...form, [key]: value, updatedAt: Math.max(Date.now(), form.updatedAt + 1) };
    latest.current = formDraft(next);
    const journaled = journalDraft(latest.current);
    setForm(next);
    setStatus('Saving draft…');
    setError(
      journaled
        ? ''
        : 'This draft could not be protected for reload. Check the field limits and save a backup.',
    );
  };
  useEffect(() => {
    const current = formDraft(form);
    let active = true;
    const timer = setTimeout(() => {
      void philosophy
        .saveDraft(current)
        .then((durable) => {
          if (active && latest.current.updatedAt === current.updatedAt)
            setStatus(
              durable
                ? 'Draft saved locally.'
                : 'Draft kept for this session. Export a backup before leaving.',
            );
        })
        .catch((cause) => {
          if (active)
            setError(cause instanceof Error ? cause.message : 'The draft could not be saved.');
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [form]);
  useEffect(
    () => () => {
      if (!finished.current) void philosophy.saveDraft(latest.current).catch(() => {});
    },
    [],
  );
  const save = async () => {
    const current = formDraft(form);
    const lesson = {
      ...current,
      title: current.title.trim(),
      author: current.author.trim(),
      question: current.question.trim(),
      body: current.body.trim(),
      updatedAt: Math.max(Date.now(), current.updatedAt + 1),
    };
    if (!validLesson(lesson)) {
      setError(
        'Add a title, author and body. Use at most 20 tags of 40 characters and 30 references.',
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      const durable = await philosophy.saveLesson(lesson);
      finished.current = true;
      onSave(lesson, durable);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The lesson could not be saved.');
    } finally {
      setBusy(false);
    }
  };
  const close = async () => {
    setBusy(true);
    try {
      await philosophy.saveDraft(latest.current);
      finished.current = true;
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The draft could not be kept.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      className={styles.editor}
      data-anchor-id={`philosophy-editor-${draft.id}`}
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          void save();
        }
      }}
    >
      <div className={styles.editorHeader}>
        <h2>{draft.title ? 'Edit your lesson' : 'Give your question a page'}</h2>
        <span role="status">{status}</span>
      </div>
      {error && (
        <p className={styles.warning} role="alert">
          {error}
        </p>
      )}
      <label>
        Lesson title
        <input
          value={form.title}
          maxLength={200}
          autoFocus
          required
          onChange={(event) => update('title', event.target.value)}
          placeholder="What is this lesson about?"
        />
      </label>
      <div className={styles.editorPair}>
        <label>
          Author
          <input
            value={form.author}
            maxLength={120}
            required
            onChange={(event) => update('author', event.target.value)}
          />
        </label>
        <label>
          Tags, separated by commas
          <input
            value={form.tagsText}
            onChange={(event) => update('tagsText', event.target.value)}
            placeholder="Your own categories"
          />
          <small>Up to 20 tags, 40 characters each</small>
        </label>
      </div>
      <label>
        Opening question <span>(optional)</span>
        <textarea
          value={form.question}
          rows={2}
          maxLength={1000}
          onChange={(event) => update('question', event.target.value)}
          placeholder="What should the reader pause to consider?"
        />
      </label>
      <label>
        Lesson body
        <textarea
          className={styles.bodyInput}
          value={form.body}
          rows={16}
          maxLength={100000}
          required
          onChange={(event) => update('body', event.target.value)}
          placeholder="Write in your own words. Plain text is welcome."
        />
        <small>
          Use # headings, - lists, 1. numbered lists, or &gt; quotations. HTML stays plain text.
        </small>
      </label>
      <label>
        References <span>(optional, one per line)</span>
        <textarea
          value={form.referencesText}
          rows={3}
          onChange={(event) => update('referencesText', event.target.value)}
          placeholder="A book, a passage, a source link…"
        />
        <small>Up to 30 references, 2,000 characters each</small>
      </label>
      <div className={styles.editorActions}>
        <button className={styles.primary} type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save lesson'}
        </button>
        <button type="button" onClick={() => void close()} disabled={busy}>
          Keep draft and close
        </button>
        <button
          type="button"
          onClick={() =>
            download(
              `${filename(form.title || 'draft')}-draft.md`,
              lessonMarkdown(formDraft(form)),
              'text/markdown',
            )
          }
        >
          Export draft Markdown
        </button>
      </div>
    </form>
  );
}

function LessonReader({
  lesson,
  reflection,
  unavailable,
  onEdit,
  onDelete,
}: {
  lesson: Lesson;
  reflection: Reflection | undefined;
  unavailable: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className={styles.reader} data-anchor-id={`philosophy-lesson-${lesson.id}`}>
      <header>
        <div className={styles.readingMeta}>
          By {lesson.author} · Updated {date(lesson.updatedAt)}
        </div>
        <h2>{lesson.title}</h2>
        <div className={styles.readerActions}>
          <button onClick={onEdit}>
            <Icon name="Pencil" size={16} /> Edit lesson
          </button>
          <button
            onClick={() =>
              download(
                `${filename(lesson.title)}.json`,
                JSON.stringify(exportLessons([lesson]), null, 2),
                'application/json',
              )
            }
          >
            Export JSON
          </button>
          <button
            onClick={() =>
              download(`${filename(lesson.title)}.md`, lessonMarkdown(lesson), 'text/markdown')
            }
          >
            Export Markdown
          </button>
          <button aria-label={`Delete lesson ${lesson.title}`} onClick={onDelete}>
            <Icon name="Trash2" size={16} />
          </button>
        </div>
      </header>
      {lesson.question && (
        <blockquote className={styles.question} data-anchor-id={`philosophy-question-${lesson.id}`}>
          {lesson.question}
        </blockquote>
      )}
      <div className={styles.prose} data-anchor-id={`philosophy-body-${lesson.id}`}>
        {safeMarkdown(lesson.body)}
      </div>
      {lesson.tags.length > 0 && (
        <ul className={styles.tags} aria-label="Lesson tags">
          {lesson.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      )}
      {lesson.references.length > 0 && (
        <section
          className={styles.references}
          data-anchor-id={`philosophy-references-${lesson.id}`}
        >
          <h3>References</h3>
          <ul>
            {lesson.references.map((ref, index) => {
              let href: string | undefined;
              try {
                const url = new URL(ref);
                if (url.protocol === 'http:' || url.protocol === 'https:') href = url.href;
              } catch {
                /* Book references remain plain text. */
              }
              return (
                <li key={index}>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {ref}
                      <Icon name="ArrowUpRight" size={13} />
                    </a>
                  ) : (
                    ref
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <PrivateReflection
        key={lesson.id}
        lessonId={lesson.id}
        initial={reflection}
        unavailable={unavailable}
      />
    </article>
  );
}
function PrivateReflection({
  lessonId,
  initial,
  unavailable,
}: {
  lessonId: string;
  initial: Reflection | undefined;
  unavailable: boolean;
}) {
  const [value, setValue] = useState(initial?.text ?? '');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const latest = useRef<Reflection>(initial ?? { lessonId, text: '', updatedAt: Date.now() });
  const touched = useRef(false);
  const change = (text: string) => {
    const next = { lessonId, text, updatedAt: Math.max(Date.now(), latest.current.updatedAt + 1) };
    latest.current = next;
    touched.current = true;
    const journaled = journalReflection(next);
    setValue(text);
    setStatus(
      journaled
        ? 'Saving private reflection…'
        : 'Reload protection is unavailable. Save or copy this reflection before leaving.',
    );
  };
  useEffect(() => {
    if (!touched.current) return;
    let active = true;
    const current = { ...latest.current };
    const timer = setTimeout(() => {
      void philosophy
        .saveReflection(current)
        .then((durable) => {
          if (active && current.updatedAt === latest.current.updatedAt)
            setStatus(
              durable
                ? 'Private reflection saved locally.'
                : 'Reflection kept for this session. Copy it before leaving.',
            );
        })
        .catch((cause) => {
          if (active)
            setStatus(
              cause instanceof Error ? cause.message : 'The reflection could not be saved.',
            );
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [value]);
  useEffect(
    () => () => {
      if (touched.current) void philosophy.saveReflection(latest.current).catch(() => {});
    },
    [],
  );
  const save = async () => {
    setBusy(true);
    try {
      const durable = await philosophy.saveReflection(latest.current);
      setStatus(
        durable
          ? 'Private reflection saved locally.'
          : 'Reflection kept for this session. Copy it before leaving.',
      );
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : 'The reflection could not be saved.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={styles.reflection} data-anchor-id={`philosophy-reflection-${lessonId}`}>
      <h3>A thought to keep</h3>
      <p>
        What changed your mind, or what remains unresolved? This reflection is private and stays out
        of lesson exports.
      </p>
      <label>
        <span className="sr-only">Your private reflection</span>
        <textarea
          value={value}
          rows={5}
          maxLength={20000}
          onChange={(event) => change(event.target.value)}
          placeholder="Leave yourself a thought to return to…"
        />
      </label>
      <div>
        <span role="status">
          {status ||
            (unavailable
              ? 'Browser storage is unavailable. Copy your reflection before leaving.'
              : 'Only on this device.')}
        </span>
        <button onClick={() => void save()} disabled={busy}>
          {busy ? 'Saving…' : 'Save reflection'}
        </button>
      </div>
    </section>
  );
}
