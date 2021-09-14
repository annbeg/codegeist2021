from transformers import pipeline
from transformers import AutoTokenizer, AutoModelForQuestionAnswering, AutoConfig

import jsonify
# import json

from flask import Flask, request
# from flask_cors import CORS, cross_origin

from datetime import datetime

app = Flask(__name__)

tokenizer = AutoTokenizer.from_pretrained("deepset/minilm-uncased-squad2")

model = AutoModelForQuestionAnswering.from_pretrained("deepset/minilm-uncased-squad2")

config = AutoConfig.from_pretrained("deepset/minilm-uncased-squad2")

answer = pipeline("question-answering",
                      model=model, tokenizer=tokenizer, config=config)




@app.route('/')
def hello():
    return 'Hello, World!'

# @app.route('/qa/<question>/<context>')
def get_answer(question, context):
    result = answer(question=question, context=context)

    return result

@app.route('/qa', methods=['POST'])
@cross_origin()
def get_answer_too():
    start = datetime.now()
    question = request.json['question']
    contexts = request.json['contexts']
    answers = []
    all_answers = []
    alle = []
    for con in contexts:
        if 'overview' in con[0]:
            continue
        ans = answer(question, con[1].replace('&nbsp;', ''))
        if ans['score'] > 0.5:
            answers.append([con[0], ans['answer']])
        all_answers.append(ans)
        alle.append([con[0], ans['answer']])

    finish = datetime.now()
    print(finish - start)
    # print(all_answers)
    return json.dumps(
        {
            'question' : question,
            'answers' : answers
        }
    )
