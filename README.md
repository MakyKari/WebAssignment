1) Setup:
    Clone this repository into your local machine
    if node_modules does not appear in your local machine, write in terminal "npm i"
    Then, type "npm start"
    Open browser and write link - "http://localhost:3000/"

2) There are several APIs used in this project:
    1) API for fetching company's close data at Global Markets, using company's ticker
    2) API for getting company's logo by name
    3) API for retriving company's detailed data, such as Location, Currency etc, by ticker name

3) Admin account:
    Go to link http://localhost:3000/login or press on your account name dropbox and after - "Exit"
    In username field type - "Aisultan"
        password field - "admin"
    You must be redirected to http://localhost:3000/admin page, where you can modify site content
    You are able to add Ticker's recommendations, CRUD users and CRUD companies cards

4) API GET endpoints:
    GET http://localhost:3000/login
    GET http://localhost:3000/register
    GET http://localhost:3000/ (accessed only via user account)
    GET http://localhost:3000/admin (accessed only via admin account)
    GET http://localhost:3000/profile (accessed only via user account)
    