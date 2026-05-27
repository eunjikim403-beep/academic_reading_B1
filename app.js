const readings = window.READING_DATA || [];

const els = {
  menuPage: document.querySelector("#menuPage"),
  studyPage: document.querySelector("#studyPage"),
  search: document.querySelector("#searchInput"),
  list: document.querySelector("#readingList"),
  back: document.querySelector("#backButton"),
  title: document.querySelector("#readingTitle"),
  passage: document.querySelector("#passageContainer"),
  questions: document.querySelector("#questionContainer"),
  summary: document.querySelector("#summaryNote"),
  vocab: document.querySelector("#vocabNote"),
};

let currentId = "";

function getStore() {
  return JSON.parse(localStorage.getItem("toefl-reallife-b1") || "{}");
}

function setStore(store) {
  localStorage.setItem("toefl-reallife-b1", JSON.stringify(store));
}

function getReading() {
  return readings.find((reading) => reading.id === currentId);
}

function getWork(readingId) {
  const store = getStore();
  if (!store[readingId]) {
    store[readingId] = { answers: {}, summary: "", vocab: "" };
    setStore(store);
  }
  return store[readingId];
}

function saveWork(readingId, updater) {
  const store = getStore();
  store[readingId] = store[readingId] || { answers: {}, summary: "", vocab: "" };
  updater(store[readingId]);
  setStore(store);
}

function renderMenu() {
  const query = els.search.value.trim().toLowerCase();
  els.list.innerHTML = "";

  readings
    .filter((reading) => reading.title.toLowerCase().includes(query))
    .forEach((reading) => {
      const work = getWork(reading.id);
      const answered = Object.values(work.answers).filter(Boolean).length;
      const button = document.createElement("button");
      button.className = "reading-card";
      button.innerHTML = `
        <strong>${reading.title}</strong>
        <span>문제 ${answered}/${reading.questions.length || 0}</span>
      `;
      button.addEventListener("click", () => openReading(reading.id));
      els.list.appendChild(button);
    });
}

function openReading(readingId) {
  currentId = readingId;
  const reading = getReading();
  const work = getWork(readingId);

  els.title.textContent = reading.title;
  els.summary.value = work.summary || "";
  els.vocab.value = work.vocab || "";
  renderPassage(reading);
  renderQuestions(reading, work);

  els.menuPage.classList.add("hidden");
  els.studyPage.classList.remove("hidden");
}

function renderPassage(reading) {
  els.passage.innerHTML = "";

  if (reading.header?.length) {
    const info = document.createElement("article");
    info.className = "document-info";
    info.innerHTML = `
      <span class="document-info-title">문서 정보</span>
      <div></div>
    `;
    const list = info.querySelector("div");
    reading.header.forEach((line) => {
      const row = document.createElement("p");
      row.textContent = line;
      list.appendChild(row);
    });
    els.passage.appendChild(info);
  }

  reading.paragraphs.forEach((paragraph, index) => {
    const block = document.createElement("article");
    block.className = "paragraph";
    block.innerHTML = `
      <span class="paragraph-number">P${index + 1}</span>
      <p>${paragraph}</p>
    `;
    els.passage.appendChild(block);
  });
}

function parseQuestion(question) {
  const markerPattern = /(^|\s)(\(?\s*([A-Da-d])\s*[.)]\)?)(?=\s)/g;
  const matches = [];
  let match;

  while ((match = markerPattern.exec(question)) !== null) {
    const markerStart = match.index + match[1].length;
    matches.push({
      letter: match[3].toUpperCase(),
      start: markerStart,
      end: markerStart + match[2].length,
    });
  }

  if (!matches.length) {
    return { stem: question, options: [] };
  }

  const stem = question.slice(0, matches[0].start).trim();
  const options = matches.map((item, index) => {
    const next = matches[index + 1]?.start ?? question.length;
    return {
      letter: item.letter,
      text: question.slice(item.end, next).trim(),
    };
  });

  return { stem, options };
}

function renderQuestions(reading, work) {
  els.questions.innerHTML = "";

  if (!reading.questions.length) {
    els.questions.innerHTML = '<p class="empty">이 리딩은 추출된 문제가 없습니다.</p>';
    return;
  }

  reading.questions.forEach((question, index) => {
    const parsed = parseQuestion(question);
    const card = document.createElement("article");
    card.className = "question-card";

    const text = document.createElement("p");
    text.className = "question-text";
    text.textContent = parsed.stem;
    card.appendChild(text);

    if (parsed.options.length) {
      const optionList = document.createElement("div");
      optionList.className = "option-list";
      parsed.options.forEach((option) => {
        const row = document.createElement("div");
        row.className = "option-line";

        const label = document.createElement("strong");
        label.textContent = option.letter;

        const optionText = document.createElement("span");
        optionText.textContent = option.text;

        row.appendChild(label);
        row.appendChild(optionText);
        optionList.appendChild(row);
      });
      card.appendChild(optionList);
    }

    const choices = document.createElement("div");
    choices.className = "choice-row";
    ["A", "B", "C", "D"].forEach((choice) => {
      const button = document.createElement("button");
      button.textContent = choice;
      button.className = work.answers[index] === choice ? "selected" : "";
      button.addEventListener("click", () => {
        saveWork(reading.id, (draft) => {
          draft.answers[index] = choice;
        });
        renderQuestions(reading, getWork(reading.id));
        renderMenu();
      });
      choices.appendChild(button);
    });
    card.appendChild(choices);
    els.questions.appendChild(card);
  });
}

els.search.addEventListener("input", renderMenu);

els.back.addEventListener("click", () => {
  els.studyPage.classList.add("hidden");
  els.menuPage.classList.remove("hidden");
  renderMenu();
});

els.summary.addEventListener("input", () => {
  if (!currentId) return;
  saveWork(currentId, (draft) => {
    draft.summary = els.summary.value;
  });
});

els.vocab.addEventListener("input", () => {
  if (!currentId) return;
  saveWork(currentId, (draft) => {
    draft.vocab = els.vocab.value;
  });
});

renderMenu();
