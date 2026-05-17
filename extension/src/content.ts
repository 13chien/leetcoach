/// <reference types="chrome" />

console.log("LeetCoach content script loaded");

function cleanProblemTitle(title: string) {
  return title
    .replace(/^\d+\.\s*/, "")
    .toLowerCase()
    .trim();
}

const session = {
  problemTitle: cleanProblemTitle(document.title.replace(" - LeetCode", "")),
  problemUrl: window.location.href,
  startedAt: Date.now(),

  activityCount: 0,
  hintsUsed: 0,
  runCount: 0,
  submitCount: 0,

  lastResult: "",
  accepted: false,

  lastCodeSnapshot: "",
  codeChangeCount: 0
};

function saveSession() {
  const updatedSession = {
    ...session,
    endedAt: Date.now(),
    durationSeconds: Math.round((Date.now() - session.startedAt) / 1000)
  };

  chrome.storage.local.set({
    [`session-${session.startedAt}`]: updatedSession
  });

  console.log("LeetCoach saved session:", updatedSession);
}

function getProblemText() {
  const text = document.body.innerText;

  return text
    .split("Example")[0]
    .slice(0, 3000);
}

function getCodeFromEditor() {
  const lines = Array.from(
    document.querySelectorAll(".view-line")
  ).map((line) => line.textContent ?? "");

  return lines.join("\n");
}

async function fetchAIHint() {
  const code = getCodeFromEditor();

  const response = await fetch("http://127.0.0.1:8000/hint", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      problemTitle: session.problemTitle,
      problemText: getProblemText(),
      code,
      hintLevel: hintIndex + 1
    })
  });

  return response.json();
}

console.log("LeetCoach session:", session);

const style = document.createElement("style");

style.textContent = `
  #leetcoach-popup {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 999999;
    width: 320px;
    padding: 16px;
    border-radius: 12px;
    background: #111827;
    color: white;
    font-family: Arial, sans-serif;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  }

  #leetcoach-popup p {
    font-size: 14px;
    margin: 8px 0 12px;
    line-height: 1.4;
  }

  #leetcoach-popup small {
    color: #9ca3af;
    line-height: 1.4;
  }

  #leetcoach-popup button {
    background: #2563eb;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    margin-right: 8px;
  }

  #leetcoach-popup button:hover {
    background: #1d4ed8;
  }
`;

document.head.appendChild(style);

let lastActivity = Date.now();
let promptShown = false;
let hintIndex = 0;

const defaultHints = [
  "Hint 1: First identify the pattern. Is this array, hashmap, two pointers, sliding window, stack, or DP?",
  "Hint 2: Think about what information you need to remember while scanning the input.",
  "Hint 3: If your first idea uses nested loops, ask whether a hashmap or pointer technique can reduce it.",
  "Hint 4: Before coding more, write the expected time and space complexity."
];

let hints = [...defaultHints];

function removePopup() {
  const existing = document.getElementById("leetcoach-popup");
  if (existing) existing.remove();
}

function markActivity() {
  lastActivity = Date.now();
  promptShown = false;
  hintIndex = 0;

  removePopup();

  session.activityCount++;
  saveSession();
}

function detectResult() {
  const pageText = document.body.innerText.toLowerCase();

  if (pageText.includes("accepted")) {
    session.lastResult = "Accepted";
    session.accepted = true;
    saveSession();
    console.log("LeetCoach accepted detected", session);
  } else if (pageText.includes("wrong answer")) {
    session.lastResult = "Wrong Answer";
    saveSession();
    console.log("LeetCoach wrong answer detected", session);
  } else if (pageText.includes("runtime error")) {
    session.lastResult = "Runtime Error";
    saveSession();
    console.log("LeetCoach runtime error detected", session);
  } else if (pageText.includes("time limit exceeded")) {
    session.lastResult = "Time Limit Exceeded";
    saveSession();
    console.log("LeetCoach TLE detected", session);
  }
}

document.addEventListener("keydown", markActivity);

document.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;

  if (target.closest("#leetcoach-popup")) {
    return;
  }

  const text = target.innerText?.toLowerCase() ?? "";

  if (text.includes("run")) {
    session.runCount++;
    console.log("LeetCoach run detected", session);
  }

  if (text.includes("submit")) {
    session.submitCount++;
    console.log("LeetCoach submit detected", session);
  }

  markActivity();

  setTimeout(detectResult, 3000);
});

function showPopup() {
  if (document.getElementById("leetcoach-popup")) return;

  const popup = document.createElement("div");
  popup.id = "leetcoach-popup";

  popup.innerHTML = `
    <strong>Stuck?</strong>

    <p id="leetcoach-text">
      You have been inactive for a bit.
      Want a small hint?
    </p>

    <button id="leetcoach-hint">
      Give me a hint
    </button>

    <button id="leetcoach-close">
      Close
    </button>
  `;

  document.body.appendChild(popup);

  const hintButton = document.getElementById("leetcoach-hint");
  const closeButton = document.getElementById("leetcoach-close");
  const text = document.getElementById("leetcoach-text");

  hintButton?.addEventListener("click", async (event) => {
    event.stopPropagation();

    if (!text || !hintButton) return;

    text.textContent = "Generating hint. This may take a few seconds if this problem is not cached yet...";

    try {
      const result = await fetchAIHint();

      text.innerHTML = `
        ${result.hint}
        <br/><br/>
        <small>
          Pattern: ${result.pattern ?? "Unknown"}<br/>
          Complexity: ${result.complexity ?? "Unknown"}<br/>
          Source: ${result.source ?? "unknown"}
        </small>
      `;

      hintIndex++;

      if (hintIndex >= 4) {
        hintButton.textContent = "No more hints";
        hintButton.setAttribute("disabled", "true");
        hintButton.style.opacity = "0.6";
        hintButton.style.cursor = "not-allowed";
      } else {
        hintButton.textContent = "Next Hint";
      }

      session.hintsUsed++;
      saveSession();
    } catch (error) {
      console.error("LeetCoach hint error:", error);

      text.textContent =
        "Could not fetch hint. Check that your backend is running.";
    }
  });

  closeButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    markActivity();
  });
}

setInterval(() => {
  const idleMs = Date.now() - lastActivity;

  if (idleMs > 10 * 1000 && !promptShown) {
    promptShown = true;

    const hasFewCodeChanges = session.codeChangeCount < 3;
    const hasUsedRuns = session.runCount > 0;
    const stuckAfterTrying = hasFewCodeChanges && hasUsedRuns;

    if (stuckAfterTrying) {
      hints[0] =
        "You have run the code several times but barely changed the implementation. Try rethinking the algorithm instead of debugging line-by-line.";
    } else {
      hints = [...defaultHints];
    }

    showPopup();
  }
}, 1000);

setInterval(() => {
  const currentCode = getCodeFromEditor();

  if (!currentCode.trim()) return;

  if (
    session.lastCodeSnapshot &&
    currentCode !== session.lastCodeSnapshot
  ) {
    session.codeChangeCount++;

    console.log("LeetCoach code changed:", session.codeChangeCount);

    saveSession();
  }

  session.lastCodeSnapshot = currentCode;
}, 3000);

window.addEventListener("beforeunload", () => {
  const completedSession = {
    ...session,
    endedAt: Date.now(),
    durationSeconds: Math.round((Date.now() - session.startedAt) / 1000)
  };

  chrome.storage.local.set({
    [`session-${session.startedAt}`]: completedSession
  });

  console.log("LeetCoach saved session:", completedSession);
});