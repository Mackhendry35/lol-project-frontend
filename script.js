

const champions = [ "Aatrox", "DrMundo", "Garen", "Renekton", "Sett", "Shen", 'Sion', "Yorick"];
// ADDED: Preload all champion images once at the top of your JS
champions.forEach(champ => {
  const img = new Image();
  img.src = `assets/lol champion portraits webp/${champ}.webp`;
});

// Track previously shown matchups
const shownMatchups = new Set();

// HOME PAGE BEFORE DISPLAYING RESULTS//
let hasVotedOrTimedOut = false;  
let timerInterval;
let resultsTimeout; // ADDED ✅

// Get a random champion excluding the provided one in champion1
function getRandomChampion(exclude = null) {
    let champ;
    do {
        champ = champions[Math.floor(Math.random() * champions.length)];
    } while (champ === exclude);
    return champ;
}

// Get a unique matchup that hasn’t been shown before
function getUniqueMatchup() {
    let champ1, champ2, matchupKey;

    do {
        champ1 = getRandomChampion();
        champ2 = getRandomChampion(champ1);
        matchupKey = [champ1, champ2].sort().join("-");
    } while (shownMatchups.has(matchupKey) && shownMatchups.size < (champions.length * (champions.length - 1)) / 2);

    if (shownMatchups.size >= (champions.length * (champions.length - 1)) / 2) {
        shownMatchups.clear(); // Reset
    }

    shownMatchups.add(matchupKey);
    return [champ1, champ2];
}

let currentMatchup = [];

function setRandomChampions() {


  currentMatchup = getUniqueMatchup();
  const [champion1, champion2] = currentMatchup;

  const champ1Img = document.getElementById("champion1");
  const champ2Img = document.getElementById("champion2");

  // ALWAYS remove 'selected' class from both images
  champ1Img.classList.remove("selected");
  champ2Img.classList.remove("selected");

  // Only update src/alt if they actually change
  if (champ1Img.alt !== champion1) {
    champ1Img.src = `assets/lol champion portraits webp/${champion1}.webp`;
    champ1Img.alt = champion1;
  }
  if (champ2Img.alt !== champion2) {
    champ2Img.src = `assets/lol champion portraits webp/${champion2}.webp`;
    champ2Img.alt = champion2;
  }

  // Remove other classes for safety
  champ1Img.classList.remove("faded", "no-hover");
  champ2Img.classList.remove("faded", "no-hover");

  // Hide vote percentages
  document.getElementById("percent1").style.display = "none";
  document.getElementById("percent2").style.display = "none";

  // Assign new click events
  champ1Img.onclick = () => handleVote(champion1);
  champ2Img.onclick = () => handleVote(champion2);
}



async function startCountdown() {
  clearInterval(timerInterval);
  clearTimeout(resultsTimeout); // ADDED ✅ - Clear previous timeout to avoid overlaps

  let timeLeft = 10;
  const countdownElement = document.getElementById("countdown");
  countdownElement.textContent = timeLeft;

  timerInterval = setInterval(async () => {
    timeLeft--;
    countdownElement.textContent = timeLeft < 10 ? `0${timeLeft}` : timeLeft;

    if (timeLeft === 0) {
  clearInterval(timerInterval);
  if (!hasVotedOrTimedOut) {
    hasVotedOrTimedOut = true;
    await displayResults(); // 3s delay is handled *inside* here now
  

        resultsTimeout = setTimeout(() => { // ADDED ✅
          hasVotedOrTimedOut = false;
          setRandomChampions();
          startCountdown();
        }, 2000);
      }
    }
  }, 1000);
}

async function handleVote(winner) {
  if (hasVotedOrTimedOut) return;
  hasVotedOrTimedOut = true;

  clearInterval(timerInterval);
  clearTimeout(resultsTimeout);

  // ✅ Add SELECTED class to clicked champ image
  const champ1Img = document.getElementById("champion1");
  const champ2Img = document.getElementById("champion2");

  // Clear previous selections
  champ1Img.classList.remove("selected");
  champ2Img.classList.remove("selected");

  // Add selection to the correct image
  if (champ1Img.alt === winner) {
    champ1Img.classList.add("selected");
  } else if (champ2Img.alt === winner) {
    champ2Img.classList.add("selected");
  }

  // 👇 Show results immediately, before waiting for vote confirmation
  displayResults(); // don't await this

  // 👇 Submit the vote in the background
  try {
    const response = await fetch('https://lol-project-backend.onrender.com/votes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        matchup: [...currentMatchup].sort().join("-"),
        vote: winner
      })
    });

    if (!response.ok) throw new Error('Vote failed');

    const data = await response.json();
    console.log('Vote registered:', data);
  } catch (error) {
    console.error('Error submitting vote:', error);
  }

  // Just display results; the 3s delay happens inside that function
  await displayResults();
}



  resultsTimeout = setTimeout(() => { // ADDED ✅
    hasVotedOrTimedOut = false;
    setRandomChampions();
    startCountdown();
  }, 2000);


async function displayResults() {
  const matchupKey = [...currentMatchup].sort().join("-");

  try {
    const response = await fetch(`https://lol-project-backend.onrender.com/votes?matchup=${matchupKey}`);
    const data = await response.json();

    if (!data || !data.vote_counts) {
      console.warn("No vote data returned for matchup:", matchupKey);
      return;
    }

    const [champion1, champion2] = currentMatchup;
    const votes1 = data.vote_counts[champion1] || 0;
    const votes2 = data.vote_counts[champion2] || 0;
    const totalVotes = votes1 + votes2;

    const percent1 = totalVotes === 0 ? 0 : Math.round((votes1 / totalVotes) * 100);
    const percent2 = totalVotes === 0 ? 0 : 100 - percent1;

    const champ1 = document.getElementById("champion1");
    const champ2 = document.getElementById("champion2");

    champ1.classList.remove("faded");
    champ2.classList.remove("faded");

    champ1.classList.add("no-hover");
    champ2.classList.add("no-hover");

    if (percent1 > percent2) {
      champ2.classList.add("faded");
    } else if (percent2 > percent1) {
      champ1.classList.add("faded");
    }

    document.getElementById("percent1").textContent = `${percent1}%`;
    document.getElementById("percent2").textContent = `${percent2}%`;
    document.getElementById("percent1").style.display = "block";
    document.getElementById("percent2").style.display = "block";

    // ✅ Wait 2 seconds AFTER updating the DOM
    resultsTimeout = setTimeout(() => {
      hasVotedOrTimedOut = false;
      setRandomChampions();
      startCountdown();
    }, 2000);

  } catch (error) {
    console.error("Failed to fetch vote data:", error);
  }
}

// Initial call
setRandomChampions();
startCountdown();
