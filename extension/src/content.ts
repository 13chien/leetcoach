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

  const response = await fetch("https://leetcoach-ixyj.onrender.com/hint", {
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

const style = document.createElement("style");

style.textContent = `
  #leetcoach-popup {
    position: fixed;
    right: 24px;
    bottom: 80px;
    z-index: 999999;
    width: 360px;
    max-height: 520px;
    overflow-y: auto;
    padding: 16px;
    border-radius: 16px;
    background: #111827;
    color: white;
    font-family: Arial, sans-serif;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  }

  #leetcoach-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  #leetcoach-subtitle {
    font-size: 12px;
    color: #9ca3af;
    margin-top: 2px;
  }

  #leetcoach-popup p {
    font-size: 14px;
    margin: 8px 0 12px;
    line-height: 1.5;
  }

  #leetcoach-popup small {
    color: #9ca3af;
    line-height: 1.5;
  }

  #leetcoach-actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }

  #leetcoach-actions button {
    flex: 1;
  }

  #leetcoach-popup button {
    background: #2563eb;
    color: white;
    border: none;
    padding: 10px 12px;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
  }

  #leetcoach-popup button:hover {
    background: #1d4ed8;
  }

  #leetcoach-close-icon {
    background: transparent !important;
    color: #9ca3af !important;
    font-size: 16px;
    padding: 0 !important;
    margin: 0 !important;
  }

  #leetcoach-close-icon:hover {
    color: white !important;
    background: transparent !important;
  }

  #leetcoach-button {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 999999;
    padding: 10px 14px;
    border-radius: 999px;
    border: none;
    background: #2563eb;
    color: white;
    cursor: pointer;
    font-weight: 700;
    box-shadow: 0 10px 20px rgba(0,0,0,0.25);
  }

  #leetcoach-button:hover {
    background: #1d4ed8;
  }

  #leetcoach-template-box {
    white-space: pre-wrap;
    background: #020617;
    padding: 10px;
    border-radius: 8px;
    overflow: auto;
    max-height: 240px;
    max-width: 100%;
    font-size: 12px;
    line-height: 1.5;
  }
`;

document.head.appendChild(style);

let lastActivity = Date.now();
let promptShown = false;
let hintIndex = 0;

function removePopup() {
  const existing = document.getElementById("leetcoach-popup");
  if (existing) existing.remove();
}

function markActivity() {
  lastActivity = Date.now();
  promptShown = false;

  const coachButton = document.getElementById("leetcoach-button");

  if (coachButton) {
    coachButton.textContent = "💡 Coach";
  }

  session.activityCount++;
  saveSession();
}

function detectResult() {
  const pageText = document.body.innerText.toLowerCase();

  if (pageText.includes("accepted")) {
    session.lastResult = "Accepted";
    session.accepted = true;
    saveSession();
  } else if (pageText.includes("wrong answer")) {
    session.lastResult = "Wrong Answer";
    saveSession();
  } else if (pageText.includes("runtime error")) {
    session.lastResult = "Runtime Error";
    saveSession();
  } else if (pageText.includes("time limit exceeded")) {
    session.lastResult = "Time Limit Exceeded";
    saveSession();
  }
}

function showCoachButton() {
  if (document.getElementById("leetcoach-button")) return;

  const button = document.createElement("button");

  button.id = "leetcoach-button";
  button.textContent = "💡 Coach";

  button.addEventListener("click", (event) => {
    event.stopPropagation();

    const existing = document.getElementById("leetcoach-popup");

    if (existing) {
      removePopup();
    } else {
      showPopup();
    }
  });

  document.body.appendChild(button);
}

function showPopup() {
  if (document.getElementById("leetcoach-popup")) return;

  const popup = document.createElement("div");

  popup.id = "leetcoach-popup";

  popup.innerHTML = `
    <div id="leetcoach-header">
      <div>
        <strong>LeetCoach</strong>

        <div id="leetcoach-subtitle">
          Your coding interview coach
        </div>
      </div>

      <button id="leetcoach-close-icon">
        ✕
      </button>
    </div>

    <p id="leetcoach-text">
      Need help with this problem?
    </p>

    <div id="leetcoach-actions">
      <button id="leetcoach-hint">
        Hint
      </button>

      <button id="leetcoach-scaffold">
        Template
      </button>
    </div>
  `;

  document.body.appendChild(popup);

  const hintButton = document.getElementById("leetcoach-hint");
  const scaffoldButton = document.getElementById("leetcoach-scaffold");
  const closeButton = document.getElementById("leetcoach-close-icon");
  const text = document.getElementById("leetcoach-text");

  hintButton?.addEventListener("click", async (event) => {
    event.stopPropagation();

    if (!text || !hintButton) return;

    text.textContent = "Generating hint...";

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
      text.textContent = "Could not fetch hint.";
    }
  });

  scaffoldButton?.addEventListener("click", async (event) => {
    event.stopPropagation();

    if (!text) return;

    text.textContent = "Generating template...";

    try {
      const result = await fetchAIHint();

      const scaffold =
        result.scaffold || "No template available yet.";

      text.innerHTML = `
        <strong>Starter Template</strong>

        <p>
          This gives you a TODO-based structure without revealing the full solution.
        </p>

        <pre id="leetcoach-template-box">${scaffold}</pre>

        <button id="leetcoach-copy-template">
          Copy Template
        </button>
      `;

      document
        .getElementById("leetcoach-copy-template")
        ?.addEventListener("click", async (copyEvent) => {

          copyEvent.stopPropagation();

          await navigator.clipboard.writeText(scaffold);

          const copyButton =
            document.getElementById("leetcoach-copy-template");

          if (copyButton) {
            copyButton.textContent = "Copied!";
          }
        });

    } catch (error) {
      console.error("LeetCoach template error:", error);
      text.textContent = "Could not generate template.";
    }
  });

  closeButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    removePopup();
  });
}

document.addEventListener("keydown", markActivity);

document.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;

  if (
    target.closest("#leetcoach-popup") ||
    target.closest("#leetcoach-button")
  ) {
    return;
  }

  const text = target.innerText?.toLowerCase() ?? "";

  if (text.includes("run")) {
    session.runCount++;
  }

  if (text.includes("submit")) {
    session.submitCount++;
  }

  markActivity();

  setTimeout(detectResult, 3000);
});

showCoachButton();

setInterval(() => {
  const idleMs = Date.now() - lastActivity;

  if (idleMs > 10 * 1000 && !promptShown) {
    promptShown = true;

    const coachButton = document.getElementById("leetcoach-button");

    if (coachButton) {
      coachButton.textContent = "Need a hint?";
    }
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
});