// Updated Codigo.gs to support new column structure

function processForm(data) {
    var questions = [];
    var currentQuestion = {};
    
    for (var i = 0; i < data.length; i++) {
        var row = data[i];
        
        if (row[0]) { // Column A = Question
            if (currentQuestion.question) { // Push previous question to array if exists
                questions.push(currentQuestion);
            }
            currentQuestion = { question: row[0], options: [], correctAnswer: row[5], nextQuestion: row[6] };
        }
        
        for (var j = 1; j <= 4; j++) { // Columns B-E = Options
            if (row[j]) {
                currentQuestion.options.push(row[j]);
            }
        }
    }
    
    if (currentQuestion.question) { // Push last question to array
        questions.push(currentQuestion);
    }
    
    // Process questions as needed
    // ....
    return questions;
}