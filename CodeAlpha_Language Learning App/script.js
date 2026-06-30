const vocabulary = [
{
word:"Hola",
translation:"Hello"
},
{
word:"Gracias",
translation:"Thank You"
},
{
word:"Amigo",
translation:"Friend"
}
];

const grammar = [
{
word:"Yo soy",
translation:"I am"
},
{
word:"Tu eres",
translation:"You are"
},
{
word:"Ellos son",
translation:"They are"
}
];

const phrases = [
{
word:"Buenos dias",
translation:"Good Morning"
},
{
word:"Como estas",
translation:"How are you?"
},
{
word:"Hasta luego",
translation:"See you later"
}
];

let currentCategory = vocabulary;
let currentIndex = 0;

function updateCard(){
    document.getElementById("word").textContent =
    currentCategory[currentIndex].word;

    document.getElementById("translation").textContent =
    currentCategory[currentIndex].translation;
}

function nextCard(){

    currentIndex++;

    if(currentIndex >= currentCategory.length){
        currentIndex = 0;
    }

    updateCard();
}

function showCategory(category){

    if(category === "vocabulary"){
        currentCategory = vocabulary;
    }

    if(category === "grammar"){
        currentCategory = grammar;
    }

    if(category === "phrases"){
        currentCategory = phrases;
    }

    currentIndex = 0;
    updateCard();
}

function speakWord(){

    const text =
    currentCategory[currentIndex].word;

    const speech =
    new SpeechSynthesisUtterance(text);

    speech.lang = "es-ES";

    speechSynthesis.speak(speech);
}

let learned =
localStorage.getItem("learned") || 0;

document.getElementById("learnedCount")
.textContent = learned;

function markLearned(){

    learned++;

    localStorage.setItem("learned", learned);

    document.getElementById("learnedCount")
    .textContent = learned;
}

const quizData = [
{
question:"Hola means?",
options:["Bye","Hello","Food","Water"],
answer:"Hello"
},
{
question:"Gracias means?",
options:["Thanks","Friend","House","Book"],
answer:"Thanks"
},
{
question:"Amigo means?",
options:["Friend","School","Chair","Phone"],
answer:"Friend"
}
];

let quizIndex = 0;
let score = 0;

function loadQuiz(){

    const q = quizData[quizIndex];

    document.getElementById("question")
    .textContent = q.question;

    const optionsDiv =
    document.getElementById("options");

    optionsDiv.innerHTML = "";

    q.options.forEach(option=>{

        const btn =
        document.createElement("button");

        btn.classList.add("optionBtn");

        btn.innerText = option;

        btn.onclick = ()=>checkAnswer(option);

        optionsDiv.appendChild(btn);
    });
}

function checkAnswer(selected){

    if(selected === quizData[quizIndex].answer){

        score++;

        document.getElementById("result")
        .innerText = "Correct!";
    }

    else{

        document.getElementById("result")
        .innerText = "Wrong Answer!";
    }

    document.getElementById("quizScore")
    .textContent = score;

    quizIndex++;

    if(quizIndex >= quizData.length){
        quizIndex = 0;
    }

    setTimeout(()=>{
        document.getElementById("result")
        .innerText = "";

        loadQuiz();
    },1000);
}

loadQuiz();
updateCard();