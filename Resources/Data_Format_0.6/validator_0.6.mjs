//Documents should match http://json-schema.org/draft-07/schema

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
      else
        console.log(`Validation successful. Schema file: ${schemaFile}. Test file: ${testFile}.`);
    } 
    catch (err) {
      console.error(err)
    }
  }
  
  //Validate device schema and example
  validate('./Schema_0.6/device_schema_0.6.json', '../Converter/output/device_0.6.json');

  //Validate record schema and example
  validate('./Schema_0.6/record_schema_0.6.json', '../Converter/output/record_0.6.json');

  //Validate analysis schema and example
  validate('./Schema_0.6/analysis_schema_0.6.json', '../Converter/output/analysis_0.6.json');
  