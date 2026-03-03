const axios = require('axios')

const Wating = async(timer)=>{
  return new Promise((resolve)=>{
    setTimeout(()=>{
      resolve(true)
    },timer)
  })
}
const getLanguageById = (lang)=>{
   const language = {
      "c++":54,
      "java":62,
      "javascript":63
   }
   return language[lang.toLowerCase()]

}

const submitBatch = async (submission)=>{
 const options = {
  method: 'POST',
  url: 'https://judge029.p.rapidapi.com/submissions/batch',
  params: {
    base64_encoded: 'false'
  },
  headers: {
    'x-rapidapi-key' : '2448a78c59msh5600c489c06fd33p1c71a6jsnc8f5b4e129e4',
    'x-rapidapi-host' : 'judge029.p.rapidapi.com',
    'Content-Type' : 'application/json'
  },
  data: {
    submissions: submission
  }
};

async function fetchData() {
	try {
		const response = await axios.request(options);
    return response.data;
	} catch (error) {
    console.error(error);
    return null;
	}
}

 return await fetchData();
}

const submitToken = async(resultToken)=>{
  

const options = {
  method: 'GET',
  url: 'https://judge029.p.rapidapi.com/submissions/batch',
  params: {
    tokens: resultToken.join(","),
    base64_encoded: 'false',
    fields: '*'
  },
  headers: {
    'x-rapidapi-key': '2448a78c59msh5600c489c06fd33p1c71a6jsnc8f5b4e129e4',
    'x-rapidapi-host': 'judge029.p.rapidapi.com'
  }
};

async function fetchData() {
	try {
		const response = await axios.request(options);
		return response.data;
	} catch (error) {
		console.error(error);
		return null;
	}
}


  while(true){
    const result = await fetchData();
    if (!result || !Array.isArray(result.submissions)) {
      return null;
    }
    const IsResultObtained = result.submissions.every((r)=>{
    return r.status_id>2
    })
if(IsResultObtained){
  return result.submissions;
}
await Wating(1000)

}


}
module.exports = {getLanguageById,submitBatch,submitToken};



















