const escapeIcsText = (value) =>
  String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

const toIcsDateTime = (isoValue) => {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
};

const getCalendarFileName = (eventData) => {
  const startDate = new Date(eventData.startTime);
  const datePart = Number.isNaN(startDate.getTime())
    ? "bokning"
    : startDate.toISOString().slice(0, 10);
  return `bokning-${datePart}.ics`;
};

export const buildCalendarIcs = (eventData) => {
  if (!eventData?.title || !eventData?.startTime || !eventData?.endTime) {
    return null;
  }
  const dtStart = toIcsDateTime(eventData.startTime);
  const dtEnd = toIcsDateTime(eventData.endTime);
  if (!dtStart || !dtEnd) {
    return null;
  }

  const nowStamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const uid = `${dtStart}-${Math.random().toString(36).slice(2)}@brf-bokningsportal`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BRF Bokningsportal//SE",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(eventData.title)}`,
    `DESCRIPTION:${escapeIcsText(eventData.description || "")}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ];
  return lines.join("\r\n");
};

export const downloadCalendarEvent = (eventData) => {
  const ics = buildCalendarIcs(eventData);
  if (!ics) {
    return false;
  }

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getCalendarFileName(eventData);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
};

export const buildCalendarDownloadPageUrl = (eventData) => {
  if (!eventData?.title || !eventData?.startTime || !eventData?.endTime) {
    return "";
  }
  const url = new URL("/calendar/add", window.location.origin);
  url.searchParams.set("title", eventData.title);
  url.searchParams.set("start", eventData.startTime);
  url.searchParams.set("end", eventData.endTime);
  if (eventData.description) {
    url.searchParams.set("description", eventData.description);
  }
  return url.toString();
};

export const buildCalendarQrImageUrl = (calendarPageUrl) => {
  if (!calendarPageUrl) {
    return "";
  }
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(calendarPageUrl)}`;
};

export const parseCalendarEventFromUrl = (url) => {
  const title = url.searchParams.get("title") || "";
  const startTime = url.searchParams.get("start") || "";
  const endTime = url.searchParams.get("end") || "";
  const description = url.searchParams.get("description") || "";
  if (!title || !startTime || !endTime) {
    return null;
  }
  if (Number.isNaN(new Date(startTime).getTime()) || Number.isNaN(new Date(endTime).getTime())) {
    return null;
  }
  return { title, startTime, endTime, description };
};
