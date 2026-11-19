// terminal_progress.js — Clean, Flicker-Free Terminal Progress Bar & Stage Status Display

class StageProgressBar {
  constructor(totalStages = 6, barWidth = 24) {
    this.totalStages = totalStages;
    this.barWidth = barWidth;
    this.currentStage = 0;
    this.currentPercent = 0;
    this.stageName = "";
  }

  startStage(stageNum, name) {
    this.currentStage = stageNum;
    this.stageName = name;
    this.update(0, "Starting...");
  }

  update(percent, detail = "") {
    this.currentPercent = Math.min(100, Math.max(0, percent));
    const filledLen = Math.round((this.currentPercent / 100) * this.barWidth);
    const emptyLen = this.barWidth - filledLen;
    const bar = "█".repeat(filledLen) + "░".repeat(emptyLen);

    const padPercent = `${this.currentPercent.toString().padStart(3, " ")}%`;
    const stagePrefix = `\x1b[36m[Stage ${this.currentStage}/${this.totalStages}]\x1b[0m \x1b[1m${this.stageName}\x1b[0m`;
    const barStr = `\x1b[32m[${bar}]\x1b[0m \x1b[33m${padPercent}\x1b[0m`;
    const detailStr = detail ? ` \x1b[90m(${detail})\x1b[0m` : "";

    // Clear line and rewrite
    process.stdout.write(`\r\x1b[K${stagePrefix} ${barStr}${detailStr}`);
  }

  completeStage(summary = "Done") {
    const filledBar = "█".repeat(this.barWidth);
    const stagePrefix = `\x1b[32m✅ [Stage ${this.currentStage}/${this.totalStages}]\x1b[0m \x1b[1m${this.stageName}\x1b[0m`;
    const barStr = `\x1b[32m[${filledBar}] 100%\x1b[0m`;
    const detailStr = summary ? ` \x1b[90m(${summary})\x1b[0m` : "";

    process.stdout.write(`\r\x1b[K${stagePrefix} ${barStr}${detailStr}\n`);
  }
}

module.exports = { StageProgressBar };
