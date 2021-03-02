# Youtube Description Preview API Key Setup
Users are asked to create their own API keys because Google only allows a certain amount of API requests per day before requiring payment. The amount of requests per individual user is relatively small compared to the total Google gives for free so there isn't really any risk of running out if you use your own api key.

Note: The API key is only required to use the feature that displays the whole description and is not needed for the short description preview.

#### Set up a free YouTube Data API key:

1. Create a new project.

   * Go to: https://console.developers.google.com/projectcreate
     
   * For "Project name" enter any name you want, for example
     "YouTube Data API Key".
   
   * For "Location" leave it as "No organization".
   
   * Then click the "CREATE" button.
   
   * This will start creating a project and you'll see a progress wheel around
     the notification icon. Once the project has finished being created,
     continue to the next step.

2. Enable the YouTube Data API v3.
   
   * Go to: https://console.cloud.google.com/apis/library/youtube.googleapis.com

   * Then click the "ENABLE" button.
   
   * Note: This may end up navigating you to another page that displays a 
     "CREATE CREDENTIALS" button. But if that happens, just ignore that button 
     and follow the instructions in the next step.

3. Create an API Key.
   
   * Go to: https://console.cloud.google.com/apis/credentials

   * Click the "+ CREATE CREDENTIALS" dropdown button, then choose "API key".

   * This will create your API key and display a dialog box. At the bottom 
     right of that dialog box, click the "RESTRICT KEY" button.

   * Then under the "API restrictions" section, click the "Restrict key" radio 
     button, and then below it, open the "Select APIs" dropdown menu and check
     the "YouTube Data API v3" checkbox.

   * Then click the "SAVE" button at the bottom of that page.
   
   * Then copy your listed API key to your clipboard (it should look something 
     like this: AIzaSyAylQ59uKlkZt2EgRPoygscGb_AHBQ5MEY).
    
     Note: If you need to access your API key in the future, it will be
     available here:
     https://console.cloud.google.com/apis/credentials
     
4. Set your API key on the extension.
  
    * Go to: https://www.youtube.com
    * Open extension settings in the top right of chrome (may have to click puzzle piece to access if extension isn't pinned)
    * Paste API key into the appropriate spot in the settings page.
  ![](APID.PNG)
