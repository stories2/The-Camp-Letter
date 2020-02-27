exports.getServerStatus = (admin, res) => {
    
    const ref = admin.database().ref('letter/status').orderByChild('time').limitToLast(4)

    ref.once('value', (snapshot) => {
        const data = snapshot.val();
        res.send({
            success: data !== null,
            data: data
        })
    })
}