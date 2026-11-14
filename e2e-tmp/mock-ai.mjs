// Stands in for the Anthropic Messages API during tests.
import http from "node:http";
import fs from "node:fs";
http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      fs.appendFileSync("/tmp/ai-req.jsonl", JSON.stringify({ url: req.url, headers: req.headers, body: JSON.parse(body || "{}") }) + "\n");
      const cases = [
        { title: "استرجاع كلمة السر بإيميل متسجل", preconditions: "حساب مفعّل", priority: "HIGH", type: "FUNCTIONAL",
          steps: [{ action: "افتح صفحة نسيت كلمة السر", expected: "" }, { action: "اكتب الإيميل واضغط إرسال", expected: "رسالة إن اللينك اتبعت" }] },
        { title: "Reset link expires after one hour", preconditions: "", priority: "MEDIUM", type: "BOUNDARY",
          steps: [{ action: "Open a reset link older than 60 minutes", expected: "Expired link message" }] },
        { title: "اللينك يتستخدم مرة واحدة", preconditions: "", priority: "BOGUS", type: "NEGATIVE",
          steps: [{ action: "غيّر كلمة السر من اللينك", expected: "تتغير" }, { action: "افتح نفس اللينك تاني", expected: "رسالة إن اللينك اتستخدم" }] },
      ];
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ id: "msg_test", type: "message", role: "assistant", content: [{ type: "tool_use", id: "tu_1", name: "save_test_cases", input: { cases } }], stop_reason: "tool_use" }));
    });
  })
  .listen(4010, "127.0.0.1");
