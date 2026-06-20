import axios from "axios";

export const generateHandoff = async (data: any) => {
  const response = await axios.post(
    "http://localhost:3000/api/handoff",
    data
  );

  return response.data;
};