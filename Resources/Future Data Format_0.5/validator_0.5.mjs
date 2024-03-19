//https://ajv.js.org/guide/schema-language.html#draft-2019-09-and-draft-2020-12

//http://json-schema.org/draft-07/schema
//http://json-schema.org/draft/2020-12/schema

//Reads in JSON data
import jsonfile from "jsonfile";

//Import JSON validator and create instance
import Ajv from "ajv";
const ajv = new Ajv({allowUnionTypes: true});

//Validates example file.
async function validate(schemaFile, testFile) {
    try {
      //Read in schema
      const schema = await jsonfile.readFile(schemaFile);
      
      //Read in example
      const testData = await jsonfile.readFile(testFile);

      //Compile schema
      const validator = ajv.compile(schema);
      
      //Validate example against schema
      const valid = validator(testData);
      if (!valid) 
        console.log(validator.errors)
    } 
    catch (err) {
      console.error(err)
    }
  }
  
  //Validate device schema and example
  validate('./Schema_0.5/device_schema_0.5.json', './Schema_0.5/device_example_0.5.json');

  //Validate record schema and example
  validate('./Schema_0.5/record_schema_0.5.json', './Schema_0.5/record_example_0.5.json');

  //Validate analysis schema and example
  validate('./Schema_0.5/analysis_schema_0.5.json', './Schema_0.5/analysis_example_0.5.json');
  