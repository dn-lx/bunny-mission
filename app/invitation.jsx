"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const TIMES = [
  { icon: "☀️", label: "Morning" },
  { icon: "🌤️", label: "Afternoon" },
  { icon: "🌙", label: "Evening" }
];
const DEFAULT_CLIPS = {
  password: "/video/flow/password.mp4",
  ask: "/video/flow/ask.mp4",
  yes: "/video/flow/yes.mp4",
  outing: "/video/flow/outing.mp4",
  detail: "/video/flow/detail.mp4",
  schedule: "/video/flow/schedule.mp4",
  success: "/video/flow/success.mp4",
  decline: "/video/flow/decline.mp4"
};
const NO_FACES = ["🤭", "😏", "🙃"];


function textValue(value, fallback, maxLength = 180) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback;
}
function localDateKey(date) {
  return date.getFullYear() + "-" +
    String(date.getMonth() + 1).padStart(2, "0") + "-" +
    String(date.getDate()).padStart(2, "0");
}
function formatDateKey(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || "")) return key || "";
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    weekday: "long", month: "long", day: "numeric"
  }).format(new Date(year, month - 1, day));
}
function formatQuestion(value, guest, sender) {
  return textValue(value, "{name}, would you like to go out with {sender}?")
    .replace(/\{name\}/g, guest)
    .replace(/\{sender\}/g, sender);
}
function getAvailableSlots(settings) {
  const output = {};
  const source = settings && settings.availableSlots;
  if (source && typeof source === "object" && !Array.isArray(source)) {
    for (const [day, labels] of Object.entries(source)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Array.isArray(labels)) continue;
      const clean = [...new Set(labels.filter(label => TIMES.some(time => time.label === label)))];
      if (clean.length) output[day] = clean;
    }
    return output;
  }
  const legacyDays = Array.isArray(settings?.availableDays) ? settings.availableDays : [];
  for (const day of legacyDays) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) output[day] = TIMES.map(time => time.label);
  }
  return output;
}
function getExtraQuestion(settings, id) {
  return (Array.isArray(settings?.extraQuestions) ? settings.extraQuestions : [])
    .find(question => question && question.id === id);
}
function sceneForStep(step) {
  if (step === "gate") return "password";
  if (step === "ask") return "ask";
  if (step === "outing") return "outing";
  if (step === "calendar") return "schedule";
  if (step === "success") return "success";
  if (step === "decline") return "decline";
  if (step.startsWith("extra:")) return "detail";
  return "ask";
}

export default function Invitation() {
  const [step, setStep] = useState("gate");
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [guest, setGuest] = useState("you");
  const [inviteId, setInviteId] = useState("");
  const [settings, setSettings] = useState({});
  const [voiceOn, setVoiceOn] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [clipPaths, setClipPaths] = useState(DEFAULT_CLIPS);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [answers, setAnswers] = useState({});
  const [noDodges, setNoDodges] = useState(0);
  const [selectedOuting, setSelectedOuting] = useState("");
  const videoRef = useRef(null);
  const [holding, setHolding] = useState("");
  const [noPosition, setNoPosition] = useState(null);
  const [viewport, setViewport] = useState(null);
  const holdTimer = useRef(null);
  const activeHold = useRef("");
  const noButton = useRef(null);

  useEffect(() => {
    const vv = window.visualViewport;
    const fullHeight = window.innerHeight;
    const update = () => setViewport({
      height: vv?.height || window.innerHeight,
      top: vv?.offsetTop || 0,
      keyboard: (vv?.height || window.innerHeight) < fullHeight * .78
    });
    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    return () => {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
      activeHold.current = "";
    };
  }, [step]);


  const sender = textValue(settings.senderName, "Alex", 48);
  const slots = useMemo(() => getAvailableSlots(settings), [settings]);
  const extras = Array.isArray(settings.extraQuestions) ? settings.extraQuestions : [];
  const configuredFlow = Array.isArray(settings.workflow)
    ? settings.workflow
    : extras.map(question => question.id);
  const activeExtraIds = [...new Set(configuredFlow)]
    .filter(id => extras.some(question => question.id === id));
  const flow = ["outing", ...activeExtraIds.map(id => "extra:" + id), "calendar"];
  const currentExtra = step.startsWith("extra:")
    ? getExtraQuestion(settings, step.slice(6))
    : null;
  const sceneKey = sceneForStep(step);
  const settingKey = step === "calendar" ? "schedule" : step;
  const sceneSettings = settings.screens?.[settingKey] || {};
  const customVoice = Boolean(currentExtra || sceneSettings.speech ||
    (step === "ask" && (sceneSettings.heading || sender !== "Alex")));
  const screenSpeech = currentExtra
    ? textValue(currentExtra.speech, currentExtra.heading, 400)
    : step === "ask"
      ? formatQuestion(sceneSettings.speech || sceneSettings.heading, guest, sender)
      : step === "calendar"
        ? textValue(sceneSettings.speech, settings.timeHeading || "Choose an open day and time.", 500)
        : textValue(sceneSettings.speech, sceneSettings.heading || "", 500);
  const askHeading = formatQuestion(sceneSettings.heading, guest, sender);
  const today = calendarMonth ? localDateKey(new Date()) : "";
  const lastDay = calendarMonth
    ? localDateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 4, 0))
    : "";
  const monthCells = useMemo(() => {
    if (!calendarMonth) return [];
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const leading = (first.getDay() + 6) % 7;
    const count = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
    return [...Array(leading).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  }, [calendarMonth]);

  useEffect(() => {
    const now = new Date();
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);
    const updateMotion = event => setReducedMotion(event.matches);
    media.addEventListener?.("change", updateMotion);
    return () => media.removeEventListener?.("change", updateMotion);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/video/flow/manifest.json", { cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then(manifest => {
        if (!active || manifest?.version !== 1 || !manifest.clips) return;
        const clean = { ...DEFAULT_CLIPS };
        for (const [key, path] of Object.entries(manifest.clips)) {
          if (Object.hasOwn(clean, key) && /^\/video\/flow\/[a-z-]+\.mp4$/.test(path)) {
            clean[key] = path;
          }
        }
        setClipPaths(clean);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    window.speechSynthesis?.cancel();
    if (!video) return;
    video.muted = !voiceOn || customVoice;
    if (!voiceOn) {
      video.pause();
      return;
    }
    setError("");
    video.currentTime = 0;
    const play = video.play();
    if (play?.catch) {
      play.catch(() => {
        if (customVoice) speakWithDevice(screenSpeech);
      });
    }
    if (customVoice) speakWithDevice(screenSpeech);
    return () => window.speechSynthesis?.cancel();
  }, [step, voiceOn, clipPaths, customVoice, screenSpeech]);

  function speakWithDevice(text) {
    if (!text || !voiceOn || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(voice => /samantha|ava|jenny|aria/i.test(voice.name));
    if (preferred) utterance.voice = preferred;
    utterance.rate = 0.88;
    utterance.pitch = 1.2;
    window.speechSynthesis.speak(utterance);
  }

  function replayBunny() {
    if (!voiceOn) {
      setVoiceOn(true);
      return;
    }
    if (customVoice) {
      speakWithDevice(screenSpeech);
      return;
    }
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.muted = false;
      video.play().catch(() => {});
    }
  }

  function requestFullscreen() {
    const root = document.documentElement;
    if (!document.fullscreenElement && root.requestFullscreen) {
      root.requestFullscreen().catch(() => {});
    }
  }

  async function unlock(event) {
    event.preventDefault();
    if (pending) return;
    setError("");
    requestFullscreen();
    setPending(true);
    try {
      const response = await fetch("/.netlify/functions/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
        cache: "no-store",
        credentials: "same-origin"
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || "This invitation could not be opened. Try again.");
      }
      setGuest(textValue(data.guestName, "you", 48));
      setInviteId(textValue(data.inviteId, "invite", 30));
      setSettings(data.settings && typeof data.settings === "object" ? data.settings : {});
      setStep("ask");
    } catch (failure) {
      setError(failure.message || "Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  function nextFrom(current) {
    const index = flow.indexOf(current);
    return flow[index + 1] || "calendar";
  }
  function previousStep() {
    const index = flow.indexOf(step);
    if (index > 0) setStep(flow[index - 1]);
    else if (step === "outing") setStep("ask");
  }

  async function submitAnswer(decision) {
    if (pending) return;
    if (decision === "yes" &&
        !(selectedDate === "Choose together" || (selectedDate && selectedTime))) {
      setError("Choose an available time, or choose a day together later.");
      return;
    }
    setPending(true);
    setError("");
    try {
      if (decision === "yes" && selectedDate !== "Choose together") {
        const check = await fetch("/.netlify/functions/unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: code.trim().toUpperCase() }),
          cache: "no-store",
          credentials: "same-origin"
        });
        const current = await check.json().catch(() => ({}));
        if (!check.ok || !current.ok) {
          throw new Error(current.message || "The invitation needs to be unlocked again.");
        }
        const latestSlots = getAvailableSlots(current.settings || {});
        setSettings(current.settings || {});
        if (!(latestSlots[selectedDate] || []).includes(selectedTime)) {
          setSelectedDate("");
          setSelectedTime("");
          throw new Error("That time just closed. Please choose another available time.");
        }
      }

      const timing = selectedDate === "Choose together"
        ? "Choose a day together later"
        : [selectedDate ? formatDateKey(selectedDate) : "", selectedTime].filter(Boolean).join(" · ");
      const extraLines = activeExtraIds.filter(id => answers[id]).map(id => {
        const question = getExtraQuestion(settings, id);
        return (question?.heading || id) + ": " + answers[id];
      });
      const summary = [
        "🐰 BUNNY MISSION",
        "",
        decision === "yes" ? "💖 " + guest + " said yes!" : "💌 " + guest + " kindly declined.",
        "",
        ...(decision === "yes" ? [
          "PLAN",
          selectedOuting === "surprise"
            ? textValue(settings.outingLabels?.surprise, "Surprise me", 75)
            : textValue(settings.outingLabels?.simple, "Something simple", 75),
          "",
          "WHEN",
          timing,
          ...(extraLines.length ? ["", "THEIR CHOICES", ...extraLines] : [])
        ] : ["No outing or date was selected."]),
        "",
        "Invitation: " + inviteId
      ].join("\n");
      const params = new URLSearchParams({
        "form-name": "going-out-develop",
        "bot-field": "",
        reply: summary,
        decision,
        subject: "Bunny Mission · " + guest + (decision === "yes" ? " said yes 💖" : " declined 💌")
      });
      const response = await fetch("/__forms.html", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
        credentials: "same-origin"
      });
      if (!response.ok) throw new Error("Your reply could not be sent just now. Please try again.");
      setStep(decision === "no" ? "decline" : "success");
    } catch (failure) {
      setError(failure.message || "That did not send. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function cancelHold() {
    window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    activeHold.current = "";
    setHolding("");
  }

  function dodgeNoButton() {
    const width = window.visualViewport?.width || window.innerWidth;
    const height = window.visualViewport?.height || window.innerHeight;
    const size = Math.min(140, width * .36);
    const old = noButton.current?.getBoundingClientRect();
    const left = old && old.left > width / 2 ? 16 : Math.max(16, width - size - 16);
    const top = [height * .32, height * .63, height * .43][noDodges];
    setNoPosition({ left, top: Math.max(64, Math.min(height - size - 16, top)) });
    setNoDodges(count => count + 1);
  }

  function startHold(choice, event) {
    if (pending || activeHold.current || (event.button !== undefined && event.button !== 0)) return;
    activeHold.current = choice;
    setHolding(choice);
    setError("");
    const dodge = choice === "no" && !reducedMotion && !event.key && noDodges < 3;
    if (dodge) dodgeNoButton();
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      activeHold.current = "";
      setHolding("");
      setNoPosition(null);
      if (choice === "yes") {
        setSelectedOuting("");
        setStep("outing");
      } else {
        submitAnswer("no");
      }
    }, dodge ? 700 : 2000);
  }

  function holdKey(choice, event) {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (!event.repeat) startHold(choice, event);
    }
  }
  function chooseDay(day) {
    setSelectedDate(day);
    setSelectedTime("");
    setError("");
  }
  function moveMonth(amount) {
    if (!calendarMonth) return;
    const next = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + amount, 1);
    const now = new Date();
    const firstAllowed = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastAllowed = new Date(now.getFullYear(), now.getMonth() + 3, 1);
    if (next >= firstAllowed && next <= lastAllowed) setCalendarMonth(next);
  }

  const isGate = step === "gate";
  const isAsk = step === "ask";
  const isDecline = step === "decline";
  const isSuccess = step === "success";
  const screenType = isGate ? "gate"
    : isAsk ? "ask"
      : step === "outing" ? "outing"
        : currentExtra ? "extra"
          : step === "calendar" ? "calendar"
            : isSuccess ? "success"
              : isDecline ? "decline"
                : "";
  const monthLabel = calendarMonth
    ? new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(calendarMonth)
    : "Loading calendar";
  const selectedSlots = selectedDate && selectedDate !== "Choose together"
    ? slots[selectedDate] || []
    : [];
  const canSend = selectedDate === "Choose together" || Boolean(selectedDate && selectedTime);
  const defaultOutings = [
    ["☕", textValue(settings.outingLabels?.simple, "Something simple", 75), "simple"],
    ["✨", textValue(settings.outingLabels?.surprise, "Surprise me", 75), "surprise"]
  ];
  const questionHeading = isAsk
    ? askHeading
    : step === "outing"
      ? textValue(settings.screens?.outing?.heading, "What sounds nice?")
      : currentExtra
        ? textValue(currentExtra.heading, "One more little question", 140)
        : step === "calendar"
          ? textValue(settings.screens?.schedule?.heading, "Which day works for you?")
          : "";
  const questionDescription = step === "outing"
    ? textValue(settings.screens?.outing?.subheading, "Choose a simple plan, or leave the idea to Alex.")
    : currentExtra
      ? "Pick the answer you like best."
      : step === "calendar"
        ? textValue(settings.screens?.schedule?.subheading, "Choose an open date and time, or ask Alex to choose a day together.")
        : "";

  function renderNoButton() {
    return (
      <button ref={noButton} className={"bm-emoji-choice bm-no-button" + (noPosition ? " bm-no-floating" : "")}
        style={noPosition ? { left: noPosition.left, top: noPosition.top } : undefined}
        type="button" aria-label="No, thank you" aria-describedby="choice-hold-hint" disabled={pending}
        onPointerDown={event => { event.currentTarget.setPointerCapture?.(event.pointerId); startHold("no", event); }}
        onPointerUp={cancelHold} onPointerLeave={() => { if (activeHold.current !== "no") cancelHold(); }} onPointerCancel={cancelHold}
        onKeyDown={event => holdKey("no", event)} onKeyUp={cancelHold} onBlur={cancelHold}
        onContextMenu={event => event.preventDefault()} onClick={event => event.preventDefault()}>
        <span aria-hidden="true">{NO_FACES[noDodges % NO_FACES.length]}</span>
        <span className="bm-choice-label" aria-hidden="true">No</span>
        {holding === "no" && <span className="bm-choice-spinner" aria-hidden="true" />}
      </button>
    );
  }

  return (
    <div className={"bm-app" + (screenType ? " bm-app--" + screenType : "") + (viewport?.keyboard ? " bm-keyboard-open" : "")} style={viewport ? { "--bm-visible-height": viewport.height + "px", "--bm-viewport-top": viewport.top + "px" } : undefined}>
      {!isDecline && (
        <header className={"bm-header" + (isAsk ? " bm-header--minimal" : "")}>
          <div className="bm-brand"><span aria-hidden="true">🐰</span> Bunny Mission</div>
          <div className="bm-header-tools">
            <button
              className="bm-icon-button"
              type="button"
              onClick={() => setVoiceOn(value => !value)}
              aria-label={voiceOn ? "Mute Bunny" : "Unmute Bunny"}
              aria-pressed={!voiceOn}
            >{voiceOn ? "🔊" : "🔇"}</button>
            {isAsk && <button className="bm-replay-button" type="button" onClick={replayBunny}>Replay</button>}
          </div>
        </header>
      )}

      <div className="bm-art">
        <button
          type="button"
          className="bm-character"
          tabIndex={isDecline ? -1 : 0}
          aria-label="Replay Bunny’s dialogue"
          onClick={replayBunny}
        >
          <video
            ref={videoRef}
            key={sceneKey}
            src={clipPaths[sceneKey] || DEFAULT_CLIPS[sceneKey]}
            poster="/video/flow/poster.webp"
            playsInline
            autoPlay
            preload="metadata"
            muted={!voiceOn || customVoice}
            onError={() => { if (voiceOn && !customVoice) speakWithDevice(screenSpeech); }}
          />
        </button>
      </div>

      <main className={"bm-screen bm-screen--" + step}>
        <section className={"bm-panel" + (isAsk ? " bm-panel--ask" : "") + (isDecline ? " bm-panel--decline" : "") + (currentExtra ? " bm-panel--question" : "")}>
          {isGate && (
            <>
              <h1>A little surprise for you.</h1>
              <p className="bm-description">Enter the invitation code Alex shared with you.</p>
              <form className="bm-code-form" onSubmit={unlock}>
                <label htmlFor="invitation-code">Invitation code</label>
                <div className="bm-code-row">
                  <input
                    id="invitation-code"
                    type={showCode ? "text" : "password"}
                    inputMode="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck="false"
                    maxLength={32}
                    placeholder="Enter code"
                    value={code}
                    enterKeyHint="go"
                    onFocus={replayBunny}
                    onChange={event => setCode(event.target.value)}
                    required
                  />
                  <button className="bm-secondary-button bm-show-code" type="button" onClick={() => setShowCode(value => !value)}>
                    {showCode ? "Hide" : "Show"}
                  </button>
                </div>
                <button className="bm-primary-button" type="submit" disabled={pending}>
                  {pending ? "Opening…" : "Unlock my invitation"}
                </button>
              </form>
              {error && <p className="bm-feedback" role="alert">{error}</p>}
            </>
          )}

          {isAsk && (
            <>
              <h1>{askHeading}</h1>
              <div className="bm-answer-row" role="group" aria-label="Your answer">
                <button className="bm-emoji-choice bm-yes-button" type="button"
                  aria-label="Yes" aria-describedby="choice-hold-hint" disabled={pending}
                  onPointerDown={event => { event.currentTarget.setPointerCapture?.(event.pointerId); startHold("yes", event); }}
                  onPointerUp={cancelHold} onPointerLeave={cancelHold} onPointerCancel={cancelHold}
                  onKeyDown={event => holdKey("yes", event)} onKeyUp={cancelHold} onBlur={cancelHold}
                  onContextMenu={event => event.preventDefault()} onClick={event => event.preventDefault()}>
                  <span aria-hidden="true">😍</span>
                  <span className="bm-choice-label" aria-hidden="true">Yes</span>
                  {holding === "yes" && <span className="bm-choice-spinner" aria-hidden="true" />}
                </button>
                {renderNoButton()}
              </div>
              <p className="bm-hold-hint" id="choice-hold-hint">Press and hold the button of your choice for 2 seconds.</p>
              <p className="bm-choice-status" role="status" aria-live="polite">{holding ? <><span className="bm-inline-spinner" aria-hidden="true" /> Next page is loading…</> : "\u00a0"}</p>
              {pending && <p className="bm-feedback" role="status">Sending your reply…</p>}
              {error && <p className="bm-feedback" role="alert">{error}</p>}
            </>
          )}

          {step === "outing" && (
            <>
              <p className="bm-eyebrow">One little choice</p>
              <h1>{questionHeading}</h1>
              <p className="bm-description">{questionDescription}</p>
              <div className="bm-option-grid" role="group" aria-label="Choose an outing">
                {defaultOutings.map(([icon, label, value]) => (
                  <button
                    key={value}
                    type="button"
                    className="bm-option-button"
                    onClick={() => { setSelectedOuting(value); setStep(nextFrom("outing")); setError(""); }}
                  >
                    <span aria-hidden="true">{icon}</span>{label}
                  </button>
                ))}
              </div>
            </>
          )}

          {currentExtra && (
            <>
              <p className="bm-eyebrow">One more little question</p>
              <h1>{questionHeading}</h1>
              <p className="bm-description">{questionDescription}</p>
              <div className="bm-option-grid bm-option-grid--questions" role="group" aria-label={questionHeading}>
                {currentExtra.options.map((option, index) => (
                  <button
                    key={index}
                    type="button"
                    className="bm-option-button"
                    onClick={() => {
                      setAnswers(previous => ({ ...previous, [currentExtra.id]: option }));
                      setStep(nextFrom(step));
                      setError("");
                    }}
                  >{option}</button>
                ))}
              </div>
            </>
          )}

          {step === "calendar" && (
            <>
              <p className="bm-eyebrow">Choose an available time</p>
              <h1>{questionHeading}</h1>
              <p className="bm-description">{questionDescription}</p>
              <p className="bm-availability" role="status">
                {Object.keys(slots).length
                  ? "Choose a date Alex has opened, then choose an available time."
                  : "Alex has not opened availability yet. You can choose a day together later."}
              </p>
              <div className="bm-calendar" aria-label="Choose an available day">
                <div className="bm-calendar-header">
                  <button type="button" className="bm-month-button" aria-label="Previous month" onClick={() => moveMonth(-1)} disabled={!calendarMonth || calendarMonth <= new Date(new Date().getFullYear(), new Date().getMonth(), 1)}>‹</button>
                  <strong>{monthLabel}</strong>
                  <button type="button" className="bm-month-button" aria-label="Next month" onClick={() => moveMonth(1)} disabled={!calendarMonth || calendarMonth >= new Date(new Date().getFullYear(), new Date().getMonth() + 3, 1)}>›</button>
                </div>
                <div className="bm-calendar-grid" role="group" aria-label={monthLabel}>
                  {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                    <span className="bm-weekday" key={day + index} aria-label={["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][index]}>{day}</span>
                  ))}
                  {monthCells.map((day, index) => {
                    if (!day) return <span className="bm-calendar-empty" key={"blank-" + index} aria-hidden="true" />;
                    const key = localDateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day));
                    const isOpen = Boolean(slots[key]?.length) && key >= today && key <= lastDay;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={"bm-day-button" + (selectedDate === key ? " is-selected" : "")}
                        disabled={!isOpen}
                        aria-pressed={selectedDate === key}
                        aria-label={formatDateKey(key) + (isOpen ? ", available" : ", unavailable")}
                        onClick={() => chooseDay(key)}
                      >{day}</button>
                    );
                  })}
                </div>
              </div>
              {selectedDate && selectedDate !== "Choose together" && (
                <div className="bm-times">
                  <p className="bm-time-heading">{textValue(settings.timeHeading, "What time of day suits you?", 180)}</p>
                  <div className="bm-time-row" role="group" aria-label="Available times of day">
                    {TIMES.filter(time => selectedSlots.includes(time.label)).map(time => (
                      <button
                        key={time.label}
                        type="button"
                        className={"bm-time-button" + (selectedTime === time.label ? " is-selected" : "")}
                        aria-pressed={selectedTime === time.label}
                        onClick={() => { setSelectedTime(time.label); setError(""); }}
                      >{time.icon} {time.label}</button>
                    ))}
                  </div>
                  <p className="bm-selected-date">{formatDateKey(selectedDate)}</p>
                </div>
              )}
              <button
                type="button"
                className={"bm-together-button" + (selectedDate === "Choose together" ? " is-selected" : "")}
                aria-pressed={selectedDate === "Choose together"}
                onClick={() => { setSelectedDate("Choose together"); setSelectedTime(""); setError(""); }}
              >Choose a day together later</button>
              <div className="bm-calendar-actions">
                <button type="button" className="bm-text-button" onClick={previousStep} disabled={pending}>Back</button>
                <button type="button" className="bm-primary-button" disabled={!canSend || pending} onClick={() => submitAnswer("yes")}>
                  {pending ? "Sending…" : "Send my choices to Alex 💌"}
                </button>
              </div>
              {error && <p className="bm-feedback" role="alert">{error}</p>}
            </>
          )}

          {isSuccess && (
            <>
              <p className="bm-eyebrow">Mission accomplished</p>
              <h1>Your choices are on their way to {sender}.</h1>
              <p className="bm-description">Bunny is doing a very tiny happy dance. ♡</p>
            </>
          )}

          {isDecline && <p className="bm-goodbye">No worries at all.</p>}

          {!isGate && !isAsk && !isDecline && !isSuccess && step !== "outing" && step !== "calendar" && (
            <div className="bm-calendar-actions">
              <button type="button" className="bm-text-button" onClick={previousStep}>Back</button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
