import "../styles/styles.css";
import App from "./pages/app.js";

const registerServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch (error) {
    console.info("Service worker belum tersedia (normal saat development).", error);
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  const app = new App({
    container: document.querySelector("#main-content"),
  });

  await app.renderPage();
  await registerServiceWorker();

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
});
