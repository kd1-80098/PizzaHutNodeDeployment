const express = require('express');
const pizzahutRouter = express.Router();
const db = require('../db');
const { constants } = require('../env');
require('dotenv').config();
const nodemailer = require('nodemailer');

//function to executecute mysql queries
function executeQuery(statement){
    return new Promise((resolve, reject) => {
        db.query(statement, (error, data) => {
            if(error){
                reject(error);
            }else{
                resolve(data);
            }
        });
    });
};

// pizzahutRouter.get('/getdata', async(request, response) => {
//     var statement = `select * from users where id = 1`;
//     var data = await executeQuery(statement);
//     response.status(200).send(data);
// });

//place order
pizzahutRouter.post('/placeorder', async(request, response) => {
    try{
        var {orderId} = request.body;
        console.log(orderId);

        var statement = `select o.id, concat(u.first_name," ", u.last_name) as username, u.email, u.mobile_no, 
        concat(a.house_no, ", ", a.street, ", ", a.city, ", ", a.state, ", ", a.country, " - ", a.pincode) as address,
        p.name, oi.total_price, oi.quantity, o.delivery_price, o.created_on
        from order_items oi, orders o, address a, pizzas p, users u
        where o.id = oi.order_id and oi.pizza_id = p.id and o.user_id = u.id and a.user_id = u.id
        and o.id = ${orderId};`;
        var data = await executeQuery(statement);
        console.log(data);

        var emailId = data[0].email;
        console.log(emailId);

        const deliveryTime = data[0].created_on.toLocaleString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });

        var tableData = ``;
        data.forEach(item => {
            tableData += `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${item.total_price}</td></tr>`;
        });

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: constants.USER,
                pass: constants.PASS
            }
        });

        console.log("before message");
    
        const message = `
Dear <strong>${data[0].username}</strong>,<br/><br/>

Thank you for choosing <strong>PizzaHut</strong>.<br/>
We are pleased to confirm the receipt of your order placed on ${deliveryTime}.
<br/><br/>
<strong>Order details:</strong><br/>
<table border='1'><tr><td><h3>Pizza</h3></td><td><h3>Quantity</h3></td><td><h3>Price</h3></tr>
${tableData}
</table>
<br/><br/>
<strong>Delivery Address:</strong> ${data[0].address}<br/>
<strong>Delivery Date:</strong> ${deliveryTime}<br/>
<strong>Total Amount:</strong> ₹ ${data[0].delivery_price}<br/><br/>

We will notify you once your order has been dispatched for delivery.<br/><br/>

If you have any questions or concerns about your order, please don't hesitate to contact our customer support team at <u>manaskelkar04@gmail.com</u> or <u>+91 9423048797</u>.
<br/><br/>
Thank you again for choosing <strong>PizzaHut</strong>. We appreciate your business!
<br/><br/>
Thank you,<br/>
PizzaHut Team<br/><br/>
`;
    
console.log("before mailoptions");
        const mailOptions = {
            from: constants.USER,
            to: emailId,
            subject: 'Order Confirmation',
            html: message,
        };
    
        console.log("before transporter");
        transporter.sendMail(mailOptions, (error, info) =>{
            if(error){
                console.log("error");
                response.status(200).send({"error": "Email not sent"});
            }else{
                console.log("sent");
                response.status(200).send({"message": "Email sent"});
            }
        });

    }catch(error){
        response.status(400).send({"error": error});
    }
});

//function to generate random password
function generatePassword() {
    const length = constants.FORGET_PASSWORD_LENGHT;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
  
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset.charAt(randomIndex);
    }
  
    return password;
}

pizzahutRouter.post('/forgotpassword', async(request, response) => {
    try{
        var {email} = request.body;
        const newPassword = generatePassword();
        var statement = `select id from users where email = '${email}'`;
        var data = await executeQuery(statement);
        if(data.length === 0){
            response.status(200).send({"error": "user not found. please check your email id."});
            return;
        }

        statement = `update users set password = '${newPassword}' where email = '${email}'`;
        data = await executeQuery(statement);

        var emailId = email;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: constants.USER,
                pass: constants.PASS
            }
        });
    
        const message = `
Dear user,

We received a request to reset your password for your PizzaHut account.
This is your temporary password is:

${newPassword}

We recommend you to login using this password and change the password in Profile tab.

Thank you,
PizzaHut Team
`;
    
console.log("before mailoptions");
        const mailOptions = {
            from: constants.USER,
            to: emailId,
            subject: 'Password Reset Request',
            text: message,
        };
    
        console.log("before transporter");
        transporter.sendMail(mailOptions, (error, info) =>{
            if(error){
                console.log("error");
                response.status(200).send({"error": "Email not sent"});
            }else{
                console.log("sent");
                response.status(200).send({"message": "password sent via email"});
            }
        });

    }catch(error){
        response.status(400).send({"error": error});
    }
});

pizzahutRouter.get('/getAllOrders', async(request, response) => {
    try{
        var statement = `select concat(u.first_name, " ",u.last_name) as username, o.* from orders o, users u
        where u.id = o.user_id`;
        var data = await executeQuery(statement);
        response.status(200).send(data);
    }catch(error){
        response.status(400).send({"error": error});
    }
});

pizzahutRouter.get('/myorders', async(request, response) => {
    try{
        var statement = `select concat(u.first_name, " ",u.last_name) as username, o.* from orders o, users u
        where u.id = o.user_id and o.delivery_status = 'PLACED'`;
        var data = await executeQuery(statement);
        response.status(200).send(data);
    }catch(error){
        response.status(400).send({"error": error});
    }
});

pizzahutRouter.post('/adminlogin', async(request, response) => {
    try{
        var {email, password} = request.body;
        var statement = `select id from users where email = '${email}' and password = '${password}' and user_role = 'ADMIN'`;
        var data = await executeQuery(statement);
        if(data.length !== 0){
            response.status(200).send("Logged In");
        }else{
            response.status(200).send("Invalid credentials");
        }
    }catch(error){
        response.status(400).send({"error": error});
    }
});

pizzahutRouter.put('/outfordelivery/:id', async(request, response) => {
    try{
        var statement = `update orders set delivery_status = 'OUTFORDELIVERY' where id = ${request.params.id}`;
        var daat = await executeQuery(statement);
        response.status(200).send("Out for delivery");
    }catch(error){
        response.status(400).send({"error": error});
    }
});

pizzahutRouter.post('/deliverylogin', async(request, response) => {
    try{
        var {email, password} = request.body;
        var statement = `select id from users where email = '${email}' and password = '${password}' and user_role = 'DELIVERYPARTNER'`;
        var data = await executeQuery(statement);
        if(data.length !== 0){
            response.status(200).send("Logged In");
        }else{
            response.status(200).send("Invalid credentials");
        }
    }catch(error){
        response.status(400).send({"error": error});
    }
});

pizzahutRouter.get('/getpreparedorders', async(request, response) => {
    try{
        var statement = `select concat(u.first_name, " ",u.last_name) as username, o.* from orders o, users u
        where u.id = o.user_id and o.delivery_status = 'OUTFORDELIVERY'`;

        var statement = `select concat(u.first_name, " ", u.last_name) as username, u.mobile_no, concat(a.house_no, ", ", a.street,
        ", ", a.city, ", ", a.state, ", ", a.country, " - ", a.pincode) as address, o.* from orders o, users u, address a
        where u.id = o.user_id and u.id = a.user_id and o.delivery_status = 'OUTFORDELIVERY'`;
        var data = await executeQuery(statement);
        response.status(200).send(data);
    }catch(error){
        response.status(400).send({"error": error});
    }
});

pizzahutRouter.put('/delivered/:id', async(request, response) => {
    try{
        var statement = `update orders set delivery_status = 'DELIVERED' where id = ${request.params.id}`;
        var daat = await executeQuery(statement);
        response.status(200).send("Delivered");
    }catch(error){
        response.status(400).send({"error": error});
    }
});

module.exports = pizzahutRouter;
