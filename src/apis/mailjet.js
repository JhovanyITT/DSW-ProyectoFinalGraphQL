const mailjet = require('node-mailjet');

const client = mailjet.apiConnect(
    '2feb7bc6a8761235c4a484239a607eff',
    '0afb6f2e8d64ea861cedb1dcb2e350e8'
);

const sendEmail = async (email, subject, htmlContent) => {
    try{
        const request = await client.post('send', { version: 'v3.1'}).request({
            Messages: [
                {
                    From: {
                        Email: 'alazamaralde@ittepic.edu.mx',
                        Name: 'Instituto Tecnologico de Tepic',
                    },
                    To: [
                        {
                            Email: email,
                            Name: email,
                        },
                    ],
                    Subject: subject,
                    HTMLPart: htmlContent,
                },
            ],
        });
        console.log(`Email sent successfully: ${request.body.Messages[0].Status}`);
    }catch(error){
        console.error('Error al enviar el correo:', error.response ? error.response.body : error);
    }
};

module.exports = { sendEmail };