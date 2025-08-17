const REACT_APP_LAMBDA_API_URL = process.env.REACT_APP_LAMBDA_API_URL;

// fetch points from the API
// this will call the API to get all points and return them as JSON
export async function fetchPoints() {
  const response = await fetch(REACT_APP_LAMBDA_API_URL, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch points');
  return response.json();
}

// add a new point to the API
// this will call the API to add a point and return the created point
export async function addPoint(pointData) {
  const response = await fetch(REACT_APP_LAMBDA_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pointData),
  });
  if (!response.ok) throw new Error('Failed to add point');
  return response.json();
}

//! IN DEVELOPMENT: Add updatePoint, deletePoint, etc. as needed
