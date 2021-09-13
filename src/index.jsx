import ForgeUI, { 
  render, 
  Fragment, 
  Form, 
  Macro, 
  ModalDialog,
  MacroConfig,
  Strong,
  Select,
  Option,
  Link,
  Text, 
  TextField, 
  Button, 
  CheckboxGroup, 
  Checkbox, 
  useState,
  useConfig } from "@forge/ui";
import api, { route } from "@forge/api";
import axios from "axios";



const defaultConfig = {
  products: [],
  product: "0"
};

const fetchContexts = async () => {
  const res = await api
    .asUser()
    .requestConfluence(route`/wiki/rest/api/content?expand=body.storage,metadata.properties.editor`);
  const data = await res.json();
  return data;
};

const getContexts = () => {
  const content_resp = useState(async () => await fetchContexts());
  const space_link = content_resp[0]['_links']['base']

  var contexts = Array.from(
    content_resp[0]['results'], x => [
      String(space_link+x['_links']['webui']), 
      x['body']['storage']['value']
      .replace(/^<ac:adf-extension>.+<\/ac:adf-extension>$/,"")
      .replace("&nbsp;", " ")
      .replace(/<\/?[^>]+(>|$)/g, " ")
      .replace(/\s{2,}/g, ' ')
      .replace(/&rsquo;/,"'"),
      x['metadata']['properties']['editor']['id']
    ]
    )

  return contexts
}

const fetchProjects = async () => {
  var response = await api.asApp().requestJira(route`/rest/api/2/project`, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
  })

  const data = await response.json()
  return data
}

const getProjects = () => {
  const proj_resp = useState(async () => await fetchProjects());
  const projects = Array.from( 
    proj_resp[0], x => [x['key'], x['name']]
    )
  return projects
}

const qa_api_adress = 'https://408e-94-25-170-18.ngrok.io/qa'

const App = () => {
  const config = useConfig() || defaultConfig;

  var contexts = getContexts()
  const [formState, setFormState] = useState(undefined);
  const [answer, setAnswer] = useState([]);
  const [question, setQuestion] = useState('');
  const [check, setCheck] = useState(false)
  
  const onSubmit = async (formData) => {
    let ans = await axios.post(qa_api_adress, {
      'question': formData['question'],
      'contexts': contexts
    }).then(response => {
        return response.data
    })
    setAnswer(ans['answers'])
    setQuestion(ans['question'])
    setFormState(formData);
    setCheck(true)
  };

  const onReport = async () => {
    var response1 = await api.asUser().requestJira(route`/rest/api/2/issue/createmeta?projectKeys=${config['product']}&issuetypeNames=Task`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    })
    const ress = await response1.json()

    const is_id = ress['projects'][0]['issuetypes'][0]['id']
  var body = `{
    "fields": {
       "project":
       {
          "key": "` + config['product']+ `"
       },
       "summary": "` + `QA App` + `",
       "description": " App returned discrepant answers. \\n \\n Question: \\n` + question + ` \\n \\n Answers : `
    for (var i=0; i<answer.length; i++){
      body = body + "\\n - " + answer[i][1] + " "
    }

    body = body + `",
          "issuetype": {
            "id": "` + is_id + `"
          },
          "labels": [
            "qa_app",
            "confluence"
          ]
      }
      
    }`
    
    var response = await api.asUser().requestJira(route`/rest/api/2/issue/`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: body
    })
    const res = await response.json()

    setOpen(false)
  }

  const [isOpen, setOpen] = useState(false);
  return (
    <Fragment >
      <Form onSubmit={onSubmit} submitButtonText="Ask">
      <Text><Strong>Enter your question:</Strong></Text>
        <TextField name="question"/>
      </Form>
      { (check  &&  answer.length == 1) &&
        <Fragment><Text>
          <Strong> Question: </Strong>
          </Text>
          <Text>{question}</Text>
          <Text><Strong>Answer:</Strong></Text>
          <Text><Link href={answer[0][0]} > - {answer[0][1]}</Link></Text>
        </Fragment>
      }
      { (check  &&  answer.length == 0) &&
        <Fragment>
        <Text>
          <Strong>Question: </Strong></Text>
          <Text>{question}</Text>
          <Text><Strong>No answer :(</Strong></Text>
        </Fragment>
      }
      { (check  &&  answer.length > 1) &&
        <Fragment>
        <Text><Strong>Question: </Strong></Text>
        <Text>{question}</Text>
         <Text><Strong>There are multiple possible answers:</Strong></Text>
         {answer.map((ans) =>
            <Text><Link href={ans[0]} > - {ans[1]}</Link></Text>
          )}
        
          <Button 
            text='Report a discrepancy' 
            appearance='warning'
            onClick={() => setOpen(true)}
            disabled = {config['products'].length == 1 ? false : true}
          />
          {isOpen && (
            <ModalDialog header="Report a discrepancy" onClose={() => setOpen(false)}>
              <Text><Strong>Question: </Strong>{question}</Text>
              <Text><Strong>Posible answers: </Strong></Text>
              {answer.map((ans) =>
                <Text> - {ans[1]}</Text>
              )}
              <Button 
                text='Report' 
                appearance='warning'
                onClick={() => onReport()}
              />
            </ModalDialog>
          )}
        </Fragment>
      }

    </Fragment>
  );
};

export const run = render(
  <Macro
    app={<App />}
  />
);

// Function that defines the configuration UI
const Config = () => {
  var projects = getProjects()

  return (
    <MacroConfig>
      <CheckboxGroup label="Jira Access" name="products">
        <Checkbox value="allow" label="Allow creating issues" />
      </CheckboxGroup>
      <Select label="Choose product" name="product">
        {projects.map((proj) => 
        <Option 
          label={proj[1]} 
          value={proj[0]} />)}
      </Select>
    </MacroConfig>
  );
};

export const config = render(<Config />);
