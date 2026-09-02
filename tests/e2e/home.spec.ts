import { expect, test } from "@playwright/test";

test("核心页面与隐私提示可见", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("dialog", { name: /DeepSeek|AI 分析/ })).toBeVisible();
  await expect(page.getByText("DeepSeek Secret")).toBeVisible();
  await page.getByRole("button", { name: /稍后设置|开始使用/ }).click();
  await expect(page.getByRole("button", { name: /接入 DeepSeek|DeepSeek 已接入/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "把一次错题，变成下一次可复用的判断规则。" })).toBeVisible();
  await expect(page.getByText("XLSX 原文件不会上传")).toBeVisible();
  await page.getByRole("button", { name: /设置/ }).click();
  await expect(page.getByRole("heading", { name: "密钥留在运行时，学习数据保持可控。" })).toBeVisible();
});
