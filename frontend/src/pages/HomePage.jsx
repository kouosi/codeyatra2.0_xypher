import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";

/* ─── Subject colour helpers ─── */
const SUBJECT_COLORS = {
  physics: "border-amber-brand/30 text-amber-brand bg-amber-brand/5",
  math: "border-emerald-300 text-emerald-600 bg-emerald-50",
};

const SUBJECT_LABELS = {
  physics: "Physics",
  math: "Mathematics",
};

const SUBJECT_OPTIONS = ["physics", "math"];

export default function HomePage() {
  const { user, authFetch } = useAuth();
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState(() => {
    const saved = localStorage.getItem("aarvana_subjects");
    return saved ? JSON.parse(saved) : ["physics"];
  });

  /* Fetch concepts from the API */
  useEffect(() => {
    authFetch("/api/concepts")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const list = json?.data?.concepts ?? json ?? [];
        setConcepts(Array.isArray(list) ? list : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* Persist subjects */
  useEffect(() => {
    localStorage.setItem("aarvana_subjects", JSON.stringify(subjects));
  }, [subjects]);

  /* Recently viewed (stored in localStorage) */
  const recentIds = JSON.parse(localStorage.getItem("aarvana_recent") || "[]");
  const recentConcepts = recentIds
    .map((id) => concepts.find((c) => c.id === id))
    .filter(Boolean)
    .slice(0, 3);

  function markViewed(id) {
    const prev = JSON.parse(localStorage.getItem("aarvana_recent") || "[]");
    const next = [id, ...prev.filter((x) => x !== id)].slice(0, 10);
    localStorage.setItem("aarvana_recent", JSON.stringify(next));
  }

  /* Group concepts by topic, filtered to selected subjects */
  const filtered = concepts.filter((c) => subjects.includes(c.subject));
  const grouped = {};
  filtered.forEach((c) => {
    if (!grouped[c.topic]) grouped[c.topic] = [];
    grouped[c.topic].push(c);
  });

  function toggleSubject(s) {
    setSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function addSubject() {
    const available = SUBJECT_OPTIONS.filter((s) => !subjects.includes(s));
    if (available.length > 0) setSubjects((prev) => [...prev, available[0]]);
  }

  const xp = 0; // TODO: compute from progress

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-amber-brand border-t-transparent animate-spin" />
          <p className="text-text-secondary text-sm animate-pulse">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* ═══ Welcome Header ═══ */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          {/* Mascot */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-brand/20 to-cream-200 flex items-center justify-center text-3xl shadow-inner">
            🐥
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
              Welcome back, {user?.name || "Explorer"}!
            </h1>
            <p className="text-text-secondary text-sm">
              Grade {user?.class || "11"} Science
            </p>
            {/* Subject badges */}
            <div className="flex gap-2 mt-1.5">
              {subjects.map((s) => (
                <span
                  key={s}
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${SUBJECT_COLORS[s] || "border-gray-200 text-text-secondary bg-gray-50"}`}
                >
                  📖 {SUBJECT_LABELS[s] || s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* XP badge */}
        <div className="flex items-center gap-1.5 text-amber-brand font-bold text-lg">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          {xp}
        </div>
      </div>

      {/* ═══ Your Subjects ═══ */}
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <span className="text-sm font-semibold text-text-secondary">Your Subjects:</span>
        {subjects.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-text-primary"
          >
            {SUBJECT_LABELS[s] || s}
            <button
              onClick={() => toggleSubject(s)}
              className="text-text-muted hover:text-red-400 transition-colors ml-0.5"
              title="Remove"
            >
              🗑
            </button>
          </span>
        ))}
        {subjects.length < SUBJECT_OPTIONS.length && (
          <button
            onClick={addSubject}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 hover:border-amber-brand px-3.5 py-1.5 text-sm font-medium text-text-secondary hover:text-amber-brand transition-colors"
          >
            + Add Subject
          </button>
        )}
      </div>

      {/* ═══ Recently Viewed ═══ */}
      {recentConcepts.length > 0 && (
        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary mb-4">
            <span className="text-text-muted">🕐</span> Recently Viewed
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentConcepts.map((c) => (
              <Link
                key={c.id}
                to={`/pathfinder`}
                onClick={() => markViewed(c.id)}
                className="rounded-2xl border border-gray-200 bg-white hover:border-amber-brand/40 hover:shadow-sm p-5 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-text-primary group-hover:text-amber-brand transition-colors">
                      {c.name}
                    </h3>
                    <p className="text-text-secondary text-sm">{c.topic}</p>
                    <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full border ${SUBJECT_COLORS[c.subject] || ""}`}>
                      {SUBJECT_LABELS[c.subject] || c.subject}
                    </span>
                  </div>
                  <svg className="w-5 h-5 text-text-muted group-hover:text-amber-brand transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ Explore More Topics ═══ */}
      <section>
        <h2 className="text-xl font-extrabold text-text-primary mb-6">
          Explore More Topics
        </h2>

        {Object.keys(grouped).length === 0 && (
          <p className="text-text-secondary text-sm">No topics found. Try adding a subject above.</p>
        )}

        {Object.entries(grouped).map(([topic, items]) => (
          <div key={topic} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-amber-brand">📖</span>
              <h3 className="font-bold text-text-primary">{topic}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((c) => (
                <Link
                  key={c.id}
                  to={`/pathfinder`}
                  onClick={() => markViewed(c.id)}
                  className="rounded-2xl border border-gray-200 bg-white hover:border-amber-brand/40 hover:shadow-sm p-4 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-text-primary group-hover:text-amber-brand transition-colors text-sm">
                        {c.name}
                      </h4>
                      <p className="text-text-muted text-xs mt-0.5">{c.topic}</p>
                    </div>
                    <svg className="w-4 h-4 text-text-muted group-hover:text-amber-brand transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
