/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const latestQuestion = document.getElementById("latestQuestion");

/* Cloudflare Worker URL for secure API communication */
const workerUrl = "https://loreal-worker.gradyhorn.workers.dev/";

/* Conversation history to maintain context */
let conversationHistory = [];

/* Store user's name for personalized interactions */
let userName = null;

/* System prompt - guides AI to focus on L'Oréal products */
function getSystemPrompt() {
  let prompt = `You are a helpful L'Oréal beauty advisor. Your purpose is to assist customers with questions about L'Oréal products, skincare routines, hair care recommendations, makeup tips, and general beauty advice. 

Always:
- Focus on L'Oréal's product lines and services
- Provide personalized recommendations based on customer needs
- Suggest appropriate L'Oréal products for different skin types and concerns

Politely decline to answer questions unrelated to beauty, skincare, haircare, or L'Oréal products. For non-beauty topics, redirect the conversation back to how you can help with L'Oréal beauty needs.`;

  if (userName) {
    prompt += `\n\nYou are speaking with ${userName}. Remember their name and use it occasionally in your responses to create a personalized experience. Refer back to what ${userName} has asked about previously in this conversation to provide consistent, context-aware recommendations.`;
  }

  return prompt;
}

/* Set initial message */
let isFirstMessage = true;
const initialMessage =
  "👋 Hello! I'm your L'Oréal Smart Product Advisor. What's your name? (You can skip this by just asking a question!)";
chatWindow.textContent = initialMessage;

/* Ask for user's name on first interaction */
let nameAsked = false;

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get user input
  const userMessage = userInput.value.trim();
  if (!userMessage) return;

  // Capture name on first message if not already done
  if (!nameAsked && !userName) {
    nameAsked = true;
    // Check if message looks like a name (short, no question marks, no products mentioned)
    if (
      userMessage.length < 30 &&
      !userMessage.includes("?") &&
      !userMessage.toLowerCase().includes("product") &&
      !userMessage.toLowerCase().includes("skin") &&
      !userMessage.toLowerCase().includes("hair")
    ) {
      // Clear initial greeting on first actual interaction
      if (isFirstMessage) {
        chatWindow.textContent = "";
        isFirstMessage = false;
      }
      userName = userMessage;
      displayMessage(userMessage, "user");
      userInput.value = "";
      displayMessage(
        `Nice to meet you, ${userName}! 💄 How can I help you today?`,
        "ai",
      );
      return;
    }
  }

  // Clear initial greeting on first actual question
  if (isFirstMessage) {
    chatWindow.textContent = "";
    isFirstMessage = false;
  }

  // Show the latest question (without clearing previous messages)
  latestQuestion.textContent = userMessage;
  latestQuestion.classList.add("active");

  // Display user message in chat
  displayMessage(userMessage, "user");
  userInput.value = "";

  // Add user message to conversation history
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  // Show loading indicator
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "msg ai";
  loadingDiv.textContent = "✨ Thinking...";
  chatWindow.appendChild(loadingDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    // Send request to Cloudflare Worker with conversation history
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: getSystemPrompt(),
          },
          ...conversationHistory,
        ],
      }),
    });

    const data = await response.json();

    // Check for API errors
    if (!response.ok || !data.choices) {
      throw new Error(data.error?.message || "Failed to get response");
    }

    // Extract AI response
    const aiMessage = data.choices[0].message.content;

    // Remove loading indicator
    const loadingMsg = chatWindow.querySelector(".ai:last-child");
    if (loadingMsg && loadingMsg.textContent === "✨ Thinking...") {
      loadingMsg.remove();
    }

    // Display AI response
    displayMessage(aiMessage, "ai");

    // Add AI response to conversation history
    conversationHistory.push({
      role: "assistant",
      content: aiMessage,
    });
  } catch (error) {
    // Remove loading indicator
    const loadingMsg = chatWindow.querySelector(".ai:last-child");
    if (loadingMsg && loadingMsg.textContent === "✨ Thinking...") {
      loadingMsg.remove();
    }

    // Display error message
    const errorMsg = `⚠️ Sorry, I encountered an error. Please try again. (${error.message})`;
    displayMessage(errorMsg, "ai");
    console.error("API Error:", error);
  }
});

/* Helper function to display messages in chat window */
function displayMessage(message, sender) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `msg ${sender}`;
  msgDiv.textContent = message;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}
