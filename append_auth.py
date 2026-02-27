import sys

file_path = r"c:\FADNA\Salon\backend\controllers\authController.js"

code_to_add = """

// @desc    Update an account
// @route   PUT /api/auth/accounts/:id
// @access  Private/Admin
exports.updateAccount = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const account = await Admin.findById(req.params.id);

        if (!account) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }

        if (username) {
            // Check if another account already has this username
            const existingUser = await Admin.findOne({ username });
            if (existingUser && existingUser._id.toString() !== account._id.toString()) {
                return res.status(400).json({ success: false, error: 'Username already exists' });
            }
            account.username = username;
        }

        if (password) {
            account.password = password; // The pre('save') hook will hash this
        }

        await account.save();
        
        res.status(200).json({ 
            success: true, 
            data: { id: account._id, username: account.username, role: account.role } 
        });
    } catch (err) {
        console.error('Update Account Error:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
"""

with open(file_path, "a", encoding="utf-8") as file:
    file.write(code_to_add)

print("Successfully appended updateAccount")
