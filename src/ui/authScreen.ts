import { supabase } from '../lib/supabaseClient';

export class AuthScreen {
  init(): void {
    const form = document.querySelector<HTMLFormElement>('#auth-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.handleSignIn();
    });
  }

  private async handleSignIn(): Promise<void> {
    const emailInput = document.querySelector<HTMLInputElement>('#auth-email');
    const passwordInput = document.querySelector<HTMLInputElement>('#auth-password');
    const submitBtn = document.querySelector<HTMLButtonElement>('#auth-submit-btn');
    const errorEl = document.querySelector<HTMLElement>('#auth-error');

    if (!emailInput || !passwordInput || !submitBtn || !errorEl) return;

    if (errorEl) errorEl.hidden = true;
    submitBtn.disabled = true;

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailInput.value,
        password: passwordInput.value,
      });

      if (error) {
        errorEl.textContent = 'メールアドレスまたはパスワードが正しくありません';
        errorEl.hidden = false;
      }
      // 成功時は何もしない（main.ts の onAuthStateChange が SIGNED_IN を検知して画面切り替え）
    } catch {
      errorEl.textContent = 'サインインに失敗しました。しばらくしてから再試行してください';
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  }
}
