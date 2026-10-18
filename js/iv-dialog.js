// Accessible confirm dialog for destructive or lossy actions (native <dialog>: focus trap, Esc to cancel).
// Falls back to window.confirm when <dialog> is unavailable.
let dlg = null;
function build() {
  const d = document.createElement("dialog");
  d.className = "iv-dialog";
  d.setAttribute("aria-labelledby", "iv-dialog-title");
  d.innerHTML = `<form method="dialog"><h3 id="iv-dialog-title"></h3><p class="iv-dialog-msg"></p><div class="iv-dialog-actions"><button type="submit" value="cancel" class="button button-secondary iv-dialog-cancel"></button><button type="submit" value="ok" class="button button-primary iv-dialog-ok"></button></div></form>`;
  document.body.append(d);
  return d;
}
/** @returns {Promise<boolean>} true when the user confirms. */
export function confirmDialog({ title = "Are you sure?", message = "", confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false } = {}) {
  if (typeof HTMLDialogElement === "undefined" || typeof HTMLDialogElement.prototype.showModal !== "function") return Promise.resolve(window.confirm(message || title));
  dlg ||= build();
  dlg.querySelector("h3").textContent = title;
  dlg.querySelector(".iv-dialog-msg").textContent = message;
  const ok = dlg.querySelector(".iv-dialog-ok"), cancel = dlg.querySelector(".iv-dialog-cancel");
  ok.textContent = confirmLabel; cancel.textContent = cancelLabel;
  ok.classList.toggle("iv-danger", !!danger);
  dlg.returnValue = "";
  return new Promise((resolve) => {
    dlg.addEventListener("close", () => resolve(dlg.returnValue === "ok"), { once: true });
    dlg.showModal();
    (danger ? cancel : ok).focus();
  });
}
