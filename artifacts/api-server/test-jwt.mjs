import jwt from 'jsonwebtoken';

const SUPABASE_URL = "https://maynbahqthdjpmnfmeqh.supabase.co";
const ANON_KEY = "sb_publishable_K8mMogmOGiJYiOGa5esK_A_jbBEO_ed";
const JWT_SECRET = "sb_secret_RY0dknhl-d9XpEaDfODkHg_n08OfKDd";

async function test() {
  console.log("Creating dummy user to test auth...");
  const email = "test" + Date.now() + "@example.com";
  const password = "password123";

  const res = await fetch(SUPABASE_URL + "/auth/v1/signup", {
    method: "POST",
    headers: {
      "apikey": ANON_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Signup failed:", data);
    return;
  }

  const token = data.session?.access_token;
  if (!token) {
    console.error("No token in response. Maybe email confirmation is on?");
    return;
  }

  console.log("Got token! Verifying...");
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    console.log("Verification SUCCESS! Payload:", payload);
  } catch (err) {
    console.error("Verification FAILED:", err.message);
  }
}

test();
