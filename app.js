const yearEl = document.getElementById("year");
yearEl.textContent = new Date().getFullYear();

const form = document.getElementById("contactForm");
const hint = document.getElementById("formHint");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hint.textContent = "Sending...";

  const formData = new FormData(form);
  const payload = {
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  };

  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      hint.textContent = data?.error
        ? `Error: ${data.error}`
        : "Error sending message.";
      return;
    }

    hint.textContent = "Sent. Thanks, we will reply soon.";
    form.reset();
  } catch (err) {
    hint.textContent = "Could not connect to the server. Is it running?";
  }
});
