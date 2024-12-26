import { Validator } from 'node-input-validator';

export const getUserRequest = async (req, res, next) => {
    try {
        let data = {
            id: req.body.id,
        }
        const validator = new Validator(data, {
            id: "required|string",
        });

        const matched = await validator.check();
        if (!matched) {
            let firstErrorField = Object.keys(validator.errors)[0]; // Get the first error field name
            let firstErrorMessage = validator.errors[firstErrorField]['message']; // Get the first error message
            res.send({
                status: 0,
                message: firstErrorMessage
            });
        } else {
            next();
        }
    } catch (error) {
        res.send({
            status: 0,
            message: "Something went wrong. Please try again later.",
        });
    }
}