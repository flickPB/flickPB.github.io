const SUPABASE_URL = "https://ldacitvtpobaijlgoojh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkYWNpdHZ0cG9iYWlqbGdvb2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4OTEwNzIsImV4cCI6MjA4OTQ2NzA3Mn0.nf8Vvl2JIircazr5nf7qP4zeUbiGxFCIfsXV3EebKDc";

const titleEl = document.getElementById("title");
const summaryEl = document.getElementById("summary");
const detailsEl = document.getElementById("details");
const statusEl = document.getElementById("status");
const openAppEl = document.getElementById("openApp");

const eventID = eventIDFromPath(window.location.pathname);

openAppEl.href = eventID ? `flickpb://event/${encodeURIComponent(eventID)}` : "flickpb://";

if (!eventID) {
  setError("This event link is missing an event id.");
} else {
  loadEvent(eventID);
}

function eventIDFromPath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0].toLowerCase() === "event") {
    return normalizedEventID(parts[1]);
  }
  return null;
}

function normalizedEventID(rawValue) {
  try {
    const candidate = decodeURIComponent(rawValue).trim();
    if (!candidate || candidate.length > 128) {
      return null;
    }
    return /^[A-Za-z0-9._:-]+$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

async function loadEvent(id) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_event_summary`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ p_event_id: id })
    });

    if (!response.ok) {
      throw new Error(`Event request failed with ${response.status}`);
    }

    const event = await response.json();
    if (!event) {
      setError("We could not find this event.");
      return;
    }

    renderEvent(event);
  } catch {
    setError("This event is not available right now. Try opening it in the Flick app.");
  }
}

function renderEvent(event) {
  titleEl.textContent = event.title || "Flick event";
  summaryEl.textContent = summaryText(event);
  detailsEl.hidden = false;
  detailsEl.replaceChildren(
    detail("When", dateRange(event.startsAt, event.endsAt)),
    detail("Where", event.location || "Location TBD"),
    detail("RSVP", rsvpText(event)),
    detail("Players", playerText(event)),
    detail("Cost", costText(event.costCents))
  );
  statusEl.textContent = event.lifecycleStatus === "cancelled"
    ? "This event has been cancelled."
    : "Use Flick to RSVP and see full event details.";
  statusEl.classList.toggle("error", event.lifecycleStatus === "cancelled");
}

function summaryText(event) {
  const format = formatText(event.format);
  const policy = event.accessPolicy === "approvalRequired" ? "approval required" : "open RSVP";
  return `${format} with ${policy}.`;
}

function formatText(format) {
  switch (format) {
  case "openPlay":
  case "open_play":
    return "Open play";
  case "roundRobin":
  case "round_robin":
    return "Round robin";
  default:
    return "Event";
  }
}

function rsvpText(event) {
  return event.accessPolicy === "approvalRequired" ? "Organizer approval required" : "Open RSVP";
}

function playerText(event) {
  const joined = nonNegativeInteger(event.joinedCount) ?? 0;
  const waitlist = nonNegativeInteger(event.waitlistCount) ?? 0;
  const cap = nonNegativeInteger(event.spotCap);
  const base = cap ? `${joined} of ${cap} spots filled` : `${joined} going`;
  return waitlist > 0 ? `${base}, ${waitlist} waitlisted` : base;
}

function costText(cents) {
  const normalizedCents = nonNegativeInteger(cents);
  if (normalizedCents === null) {
    return "Free or handled separately";
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD"
  }).format(normalizedCents / 100);
}

function nonNegativeInteger(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return null;
  }
  return Math.floor(number);
}

function dateRange(startsAt, endsAt) {
  if (!startsAt) {
    return "Time TBD";
  }

  const start = new Date(startsAt);
  if (!isValidDate(start)) {
    return "Time TBD";
  }

  const end = endsAt ? new Date(endsAt) : null;
  const date = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(start);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(start);

  if (!isValidDate(end)) {
    return `${date}, ${time}`;
  }

  const endTime = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(end);
  return `${date}, ${time} - ${endTime}`;
}

function isValidDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function detail(label, value) {
  const row = document.createElement("div");
  const labelEl = document.createElement("span");
  const valueEl = document.createElement("span");
  row.className = "detail-row";
  labelEl.textContent = label;
  valueEl.textContent = value;
  row.append(labelEl, valueEl);
  return row;
}

function setError(message) {
  statusEl.textContent = message;
  statusEl.classList.add("error");
}
