import { useState } from "react";
import { useModalAccessibility } from "@/lib/hooks/use-modal-accessibility";

interface PasswordModalProps {
  isOpen: boolean;
  onSubmit: (password: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  isCreation?: boolean; // True if creating a password (send), False if entering (receive)
}

export default function PasswordModal({
  isOpen,
  onSubmit,
  onCancel,
  title = "Password Required",
  description = "This file is encrypted. Please enter the password to decrypt it.",
  isCreation = false,
}: PasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const { modalRef, handleKeyDown } = useModalAccessibility(isOpen, onCancel);

  if (!isOpen) return null;

  // Simple password strength calculation
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: "", color: "" };

    let score = 0;

    // Length
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (pwd.length >= 16) score += 1;

    // Character variety
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;

    // Normalize to 0-3 scale
    const normalizedScore = Math.min(3, Math.floor(score / 2.5));

    const labels = ["Weak", "Fair", "Good", "Strong"];
    const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];

    return {
      score: normalizedScore,
      label: labels[normalizedScore],
      color: colors[normalizedScore],
    };
  };

  const strength = isCreation ? getPasswordStrength(password) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setError("Password cannot be empty");
      return;
    }

    // AUDIT FIX: Require password confirmation in creation mode
    if (isCreation) {
      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    onSubmit(password);
    setPassword("");
    setConfirmPassword("");
    setError("");
  };

  return (
    <div
      ref={modalRef}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="bg-surface border border-subtle p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-primary/10 p-2 rounded-full border border-primary/20">
            <span className="material-symbols-outlined text-primary text-2xl">lock</span>
          </div>
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">{title}</h2>
        </div>

        <p className="text-gray-400 text-sm mb-6 font-mono leading-relaxed">{description}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1">
            <label
              htmlFor="password-modal-input"
              className="text-xs font-bold text-primary uppercase tracking-wider"
            >
              {isCreation ? "Set Password" : "Enter Password"}
            </label>
            <input
              id="password-modal-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 focus:border-primary text-white px-4 py-3 outline-none font-mono transition-colors"
              placeholder={isCreation ? "Create a secure password..." : "••••••••"}
              autoFocus
              autoComplete={isCreation ? "new-password" : "current-password"}
            />
            {isCreation && password && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Password strength:</span>
                  <span
                    className={`font-bold ${
                      strength?.score === 0
                        ? "text-red-500"
                        : strength?.score === 1
                          ? "text-orange-500"
                          : strength?.score === 2
                            ? "text-yellow-500"
                            : "text-green-500"
                    }`}
                  >
                    {strength?.label}
                  </span>
                </div>
                <div className="flex gap-1 h-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-colors ${
                        i <= (strength?.score ?? 0) ? strength?.color : "bg-gray-700"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
            {isCreation && !password && (
              <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            )}
          </div>

          {isCreation && (
            <div className="space-y-1">
              <label
                htmlFor="confirm-password-input"
                className="text-xs font-bold text-primary uppercase tracking-wider"
              >
                Confirm Password
              </label>
              <input
                id="confirm-password-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 focus:border-primary text-white px-4 py-3 outline-none font-mono transition-colors"
                placeholder="Re-enter password..."
                autoComplete="new-password"
              />
            </div>
          )}

          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-12 border border-white/10 hover:bg-white/5 text-gray-300 font-bold uppercase tracking-wider text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-12 bg-primary hover:bg-primary-hover text-black font-bold uppercase tracking-wider text-sm transition-colors shadow-lg shadow-primary/20"
            >
              {isCreation ? "Set Password" : "Decrypt"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
