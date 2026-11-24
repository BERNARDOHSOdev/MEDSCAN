export function validateRegistration({ name, age, email, password, confirmPassword, whatsapp = "" }) {
  if (!name.trim() || !String(age).trim() || !email.trim() || !password || !confirmPassword) return "Preencha todos os campos para criar sua conta.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Informe um e-mail válido.";
  if (!Number.isInteger(Number(age)) || Number(age) < 0 || Number(age) > 120) return "Informe uma idade entre 0 e 120 anos.";
  if (password.length < 8) return "Use uma senha com pelo menos 8 caracteres.";
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) return "Inclua uma letra maiúscula, uma minúscula e um número na senha.";
  if (whatsapp.trim() && !/^(?:55)?[1-9][0-9]9[0-9]{8}$/.test(whatsapp.replace(/[\s()+-]/g, ""))) return "Informe um WhatsApp brasileiro com DDD e 9 dígitos.";
  if (new TextEncoder().encode(password).length > 72) return "Use uma senha de até 72 bytes (acentos e emojis ocupam mais espaço).";
  if (password !== confirmPassword) return "A confirmação precisa ser igual à senha.";
  return "";
}
