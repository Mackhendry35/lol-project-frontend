let allRawResults = {}; // ADDED ✅

// ADDED BY THE CODE: Preload portrait images
function preloadImage(url) {
  const img = new Image();
  img.src = url;
}

// ADDED BY THE CODE: Preload all portraits as soon as we have the results
function preloadAllPortraits() {
  const loadedPortraits = new Set();
  for (const [matchupKey, votes] of Object.entries(allRawResults)) {
    let [champ1, champ2] = matchupKey.split(/[-_]/);
    if (!loadedPortraits.has(champ1)) {
      preloadImage(getPortraitURL(champ1));
      loadedPortraits.add(champ1);
    }
    if (!loadedPortraits.has(champ2)) {
      preloadImage(getPortraitURL(champ2));
      loadedPortraits.add(champ2);
    }
  }
}

function getPortraitURL(championName) {
  return `assets/lol champion portraits webp/${championName}.webp`;
}

// ADDED ✅ Added `preferredLeftChamp` as third argument
function createResultCard(matchupKey, votes, preferredLeftChamp = null) {
  console.log("✅ createResultCard was called!");
  let [champ1, champ2] = matchupKey.split(/[-_]/); // Handle both '-' and '_' keys

  const champ1Votes = votes[champ1] || 0;
  const champ2Votes = votes[champ2] || 0;
  const totalVotes = champ1Votes + champ2Votes;

  console.log(champ1, champ2, champ1Votes, champ2Votes);

  if (totalVotes === 0) return null;

  // ADDED ✅ Swap champs if needed to ensure preferred champ is on the left
  if (preferredLeftChamp) {
    const champ1Lower = champ1.toLowerCase();
    const champ2Lower = champ2.toLowerCase();
    if (champ2Lower === preferredLeftChamp && champ1Lower !== preferredLeftChamp) {
      [champ1, champ2] = [champ2, champ1];
    }
  }

  let updatedChamp1Votes = votes[champ1] || 0;
  let updatedChamp2Votes = votes[champ2] || 0;
  let champ1Pct = ((updatedChamp1Votes / totalVotes) * 100).toFixed(1);
  let champ2Pct = ((updatedChamp2Votes / totalVotes) * 100).toFixed(1);

  if (preferredLeftChamp) {
    const champ1Lower = champ1.toLowerCase();
    const champ2Lower = champ2.toLowerCase();
    if (champ2Lower === preferredLeftChamp && champ1Lower !== preferredLeftChamp) {
      [champ1, champ2] = [champ2, champ1];
      [updatedChamp1Votes, updatedChamp2Votes] = [updatedChamp2Votes, updatedChamp1Votes];
      [champ1Pct, champ2Pct] = [champ2Pct, champ1Pct];
    }
  } else {
    if (parseFloat(champ2Pct) > parseFloat(champ1Pct)) {
      [champ1, champ2] = [champ2, champ1];
      [updatedChamp1Votes, updatedChamp2Votes] = [updatedChamp2Votes, updatedChamp1Votes];
      [champ1Pct, champ2Pct] = [champ2Pct, champ1Pct];
    }
  }

  console.log(getPortraitURL(champ1), getPortraitURL(champ2));

  const container = document.createElement('div');
  container.className = 'matchup';

  container.innerHTML = `
    <div class="champion-row">
      <div class="champion">
        <img src="${getPortraitURL(champ1)}" alt="${champ1}">
        <p>${champ1Pct}% (${updatedChamp1Votes} votes)</p>
      </div>
      <div class="vs">vs.</div>
      <div class="champion">
        <img src="${getPortraitURL(champ2)}" alt="${champ2}">
        <p>${champ2Pct}% (${updatedChamp2Votes} votes)</p>
      </div>
    </div>
    <hr>
  `;

  return {
    element: container,
    totalVotes,
    champ1: champ1.toLowerCase(),
    champ2: champ2.toLowerCase(),
    maxPct: Math.max(parseFloat(champ1Pct), parseFloat(champ2Pct)),
    mainChampPct: preferredLeftChamp
      ? (champ1.toLowerCase() === preferredLeftChamp
          ? parseFloat(champ1Pct)
          : parseFloat(champ2Pct))
      : Math.max(parseFloat(champ1Pct), parseFloat(champ2Pct)), // fallback
  };
}

async function loadResults() {
  console.log("✅ loadResults() was called!");
  try {
    const response = await fetch('https://lol-project-backend.onrender.com/votes');
    const rawData = await response.json();

    // ADDED ✅ Convert Supabase array into key-value object like old format
    const convertedData = {};
    if (rawData.votes && typeof rawData.votes === 'object') {
      // Already converted format from backend
      Object.assign(convertedData, rawData.votes);
    } else if (Array.isArray(rawData)) {
      // Raw array (fallback)
      rawData.forEach(entry => {
        convertedData[entry.matchup] = entry.vote_counts;
      });
    } else {
      console.warn("⚠️ Unexpected data format from backend", rawData);
    }

    allRawResults = convertedData; // ADDED ✅ Store for filtering

    preloadAllPortraits(); // ADDED BY THE CODE: Preload all images before displaying

    displayFilteredResults(); // Show filtered results
  } catch (error) {
    console.error('Error loading results:', error);
  }
}

function displayFilteredResults() {
  const champ1Input = document.getElementById('champ1Input').value.trim().toLowerCase();
  const champ2Input = document.getElementById('champ2Input').value.trim().toLowerCase();

  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';

  const resultEntries = [];

  for (const [matchupKey, votes] of Object.entries(allRawResults)) {
    const [a, b] = matchupKey.split(/[-_]/).map(c => c.toLowerCase());

    const input1Match = a === champ1Input || b === champ1Input;
    const input2Match = a === champ2Input || b === champ2Input;

    const isSingleChampSearch = champ1Input && !champ2Input;
    const isTwoChampSearch = champ1Input && champ2Input;

    let shouldShow = false;

    if (isTwoChampSearch) {
      shouldShow =
        (a === champ1Input && b === champ2Input) ||
        (a === champ2Input && b === champ1Input);
    } else if (isSingleChampSearch) {
      shouldShow = input1Match;
    } else {
      shouldShow = true;
    }

    if (shouldShow) {
      const card = createResultCard(matchupKey, votes, champ1Input); // ADDED ✅
      if (card) resultEntries.push(card);
    }
  }

  const sortBy = champ1Input ? 'mainChampPct' : 'maxPct';
  resultEntries.sort((a, b) => b[sortBy] - a[sortBy]);
  resultEntries.forEach(entry => resultsDiv.appendChild(entry.element)); // ADDED ✅
}

// ADDED ✅ Event listeners and onload
document.getElementById('champ1Input').addEventListener('input', displayFilteredResults);
document.getElementById('champ2Input').addEventListener('input', displayFilteredResults);
window.onload = loadResults;
