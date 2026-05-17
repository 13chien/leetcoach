/// <reference types="chrome" />

import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

type Session = {
  problemTitle: string;
  problemUrl: string;

  startedAt: number;
  endedAt?: number;

  durationSeconds?: number;

  activityCount: number;
  hintsUsed: number;

  runCount?: number;
  submitCount?: number;

  lastResult?: string;
  accepted?: boolean;

  lastCodeSnapshot?: string;
  codeChangeCount?: number;
};

function Popup() {

  const [sessions, setSessions] =
    useState<Session[]>([]);

  useEffect(() => {

    chrome.storage.local.get(
      null,
      (items: Record<string, any>) => {

        const savedSessions =
          Object.values(items)

            .filter(
              (item: any) =>
                item.problemTitle &&
                item.problemUrl
            )

            .sort(
              (a: any, b: any) =>
                b.startedAt - a.startedAt
            ) as Session[];

        setSessions(savedSessions);
      }
    );

  }, []);

  function clearSessions() {

    chrome.storage.local.clear(() => {

      setSessions([]);

      console.log(
        "LeetCoach sessions cleared"
      );
    });
  }

  const totalHints =
    sessions.reduce(
      (sum, s) =>
        sum + s.hintsUsed,
      0
    );

  const totalActivity =
    sessions.reduce(
      (sum, s) =>
        sum + s.activityCount,
      0
    );

  const totalRuns =
    sessions.reduce(
      (sum, s) =>
        sum + (s.runCount ?? 0),
      0
    );

  const totalSubmits =
    sessions.reduce(
      (sum, s) =>
        sum + (s.submitCount ?? 0),
      0
    );

  const totalCodeChanges =
    sessions.reduce(
      (sum, s) =>
        sum +
        (s.codeChangeCount ?? 0),
      0
    );

  const totalSeconds =
    sessions.reduce(
      (sum, s) =>
        sum +
        (s.durationSeconds ?? 0),
      0
    );

  const acceptedCount =
    sessions.filter(
      (s) => s.accepted
    ).length;

  const avgHints =
    sessions.length === 0
      ? 0
      : (
          totalHints /
          sessions.length
        ).toFixed(1);

  return (

    <div
      style={{
        width: 380,
        minHeight: 520,
        padding: 18,

        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Arial",

        background: "#0f172a",
        color: "#e5e7eb"
      }}
    >

      <div
        style={{
          marginBottom: 18
        }}
      >

        <h1
          style={{
            margin: 0,
            fontSize: 24
          }}
        >
          LeetCoach
        </h1>

        <p
          style={{
            margin: "6px 0 0",
            color: "#94a3b8",
            fontSize: 13
          }}
        >
          Your coding interview practice assistant
        </p>

        <button
          onClick={clearSessions}

          style={{
            marginTop: 12,

            padding: "8px 10px",

            borderRadius: 10,

            border:
              "1px solid #334155",

            background: "#1e293b",

            color: "#e5e7eb",

            cursor: "pointer",

            fontSize: 12
          }}
        >
          Clear Sessions
        </button>

      </div>

      <div
        style={{
          display: "grid",

          gridTemplateColumns:
            "1fr 1fr",

          gap: 10,

          marginBottom: 16
        }}
      >

        <StatCard
          label="Problems"
          value={sessions.length}
        />

        <StatCard
          label="Accepted"
          value={acceptedCount}
        />

        <StatCard
          label="Hints Used"
          value={totalHints}
        />

        <StatCard
          label="Code Changes"
          value={totalCodeChanges}
        />

      </div>

      <div
        style={{
          padding: 14,

          borderRadius: 14,

          background: "#111827",

          border:
            "1px solid #1f2937",

          marginBottom: 16
        }}
      >

        <div
          style={{
            fontSize: 13,
            color: "#94a3b8"
          }}
        >
          Practice Summary
        </div>

        <div
          style={{
            marginTop: 10,

            display: "flex",

            flexDirection: "column",

            gap: 8,

            fontSize: 14
          }}
        >

          <div>
            Total practice time:
            {" "}
            <strong>
              {Math.round(
                totalSeconds / 60
              )}
              {" "}min
            </strong>
          </div>

          <div>
            Runs:
            {" "}
            <strong>
              {totalRuns}
            </strong>
          </div>

          <div>
            Submits:
            {" "}
            <strong>
              {totalSubmits}
            </strong>
          </div>

          <div>
            Avg hints per problem:
            {" "}
            <strong>
              {avgHints}
            </strong>
          </div>

          <div>
            Activity events:
            {" "}
            <strong>
              {totalActivity}
            </strong>
          </div>

        </div>
      </div>

      <h2
        style={{
          fontSize: 15,
          margin: "0 0 10px"
        }}
      >
        Recent Sessions
      </h2>

      {sessions.length === 0 ? (

        <div
          style={{
            padding: 14,

            borderRadius: 14,

            background: "#111827",

            color: "#94a3b8",

            fontSize: 13,

            lineHeight: 1.5
          }}
        >
          No sessions yet.

          Open a LeetCode problem,
          wait for the coach popup,
          and use a hint.
        </div>

      ) : (

        <div
          style={{
            display: "flex",

            flexDirection: "column",

            gap: 10
          }}
        >

          {sessions
            .slice(0, 5)
            .map((s) => (

            <div
              key={s.startedAt}

              style={{
                padding: 12,

                borderRadius: 14,

                background: "#111827",

                border:
                  "1px solid #1f2937"
              }}
            >

              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14
                }}
              >
                {s.problemTitle}
              </div>

              <div
                style={{
                  marginTop: 6,

                  color: "#94a3b8",

                  fontSize: 12,

                  display: "flex",

                  flexWrap: "wrap",

                  gap: 8
                }}
              >

                <span>
                  {s.durationSeconds ?? 0}s
                </span>

                <span>
                  {s.hintsUsed} hints
                </span>

                <span>
                  {s.activityCount} actions
                </span>

                <span>
                  {s.runCount ?? 0} runs
                </span>

                <span>
                  {s.submitCount ?? 0} submits
                </span>

                <span>
                  {s.codeChangeCount ?? 0}
                  {" "}code changes
                </span>

                <span>
                  {s.lastResult ||
                    "No result"}
                </span>

              </div>

            </div>

          ))}

        </div>

      )}

    </div>
  );
}

function StatCard({
  label,
  value
}: {
  label: string;
  value: string | number;
}) {

  return (

    <div
      style={{
        padding: 12,

        borderRadius: 14,

        background: "#111827",

        border:
          "1px solid #1f2937"
      }}
    >

      <div
        style={{
          fontSize: 12,
          color: "#94a3b8"
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 22,

          fontWeight: 700,

          marginTop: 4
        }}
      >
        {value}
      </div>

    </div>
  );
}

createRoot(
  document.getElementById("root")!
).render(<Popup />);