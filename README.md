Shield: [![CC BY 4.0][cc-by-shield]][cc-by]

This work is licensed under a
[Creative Commons Attribution 4.0 International License][cc-by].

[![CC BY 4.0][cc-by-image]][cc-by]

[cc-by]: http://creativecommons.org/licenses/by/4.0/
[cc-by-image]: https://i.creativecommons.org/l/by/4.0/88x31.png
[cc-by-shield]: https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg


<h1>Project Name - Data Recording Rig</h1>

Welcome to the server component of the Data Recording Rig! This server plays a crucial role in managing and processing data collected from various sources, providing a robust backend for the entire system.


<h2>Overview</h2>

The server is designed to handle tasks such as processing audio and image data, managing EEG files, analyzing sentiment, and orchestrating the generation of a final output file. It acts as the backbone, ensuring seamless communication between different modules and facilitating data transformation and consolidation.


<h2>Features</h2>

<h5>Data Processing:</h5> Efficiently processes diverse data types, including audio, image, and EEG data.
<h5>Real-time Updates:</h5> Regularly updates the final output file with the latest information from various sources.
<h5>Hashing and Cloud Integration:</h5> Implements secure data hashing and interacts with cloud services to ensure data integrity.
<h5>Session Management:</h5> Monitors and manages user sessions, creating new sessions when needed.
<h5>File Handling:</h5> Manages various data files, ensuring proper organization and storage.


<h2>Headset Enviroment: </h2>
The Emotive Headset Authentification details must be store int the server/.env file, and contain:
<h5>HEADSET_CLIENT_SECRET = 'YourHeadsetSecret'</h5> 
<h5>HEADSET_CLIENT_ID = 'YourHeadseclientID'</h5> 
<h5>HEADSET_LICENSE = 'YourHeadsetLicense' </h5>


<h2>Connection Hosts: </h2>
Please update the host url for all the data, when/if you are modifying the network.
<h5>!!! The RIG and Server must be connected to the same Network</h5>

Examples:
http://192.168.0.57:8080 - My home wifi
http://172.20.10.4:8080 - My phone hotspot


<h2>User Manual: </h2>
For detailed instructions on how to build the system, please refer to the user manual available at the following link:

``
https://github.com/ancara22/pi-server/blob/df1e6d27642e000038c959c5ba7c225e1d0c547c/Resources/RIG%20User%20Manual.pdf
``

<h2>Documentation: </h2>
To generate and open the documentation you can run the commands:

- To generate the documentation
``
npm docs 
``

- To open the documentation in a browser page
``
npm open-docs  
``