-- Users
INSERT INTO users (id, email, password_hash, display_name) VALUES (1, 'host@slido.dev', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'Sarah Chen');
INSERT INTO users (id, email, password_hash, display_name) VALUES (2, 'alice@team.dev', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'Alice Park');

-- Session: SLIDODEV
INSERT INTO sessions (id, code, title, is_moderated, owner_id) VALUES (1, 'SLIDODEV', 'Slido Clone: Feature Prioritization', 0, 1);

-- Questions
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (1, 'Should we prioritize real-time collaboration features like Google Docs-style co-editing of polls, or keep the current single-author model?', 'Alice Park', 1, 1, 0, 1);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (2, 'How are we planning to handle user authentication? JWT tokens seem fine for an MVP, but should we consider OAuth2 with Google/GitHub for a smoother sign-up experience?', 'Bob Martinez', 1, 0, 1, 1);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (3, 'The word cloud feature looks cool but feels like a nice-to-have. Can we defer it and focus on getting the presenter mode right first?', 'Carol Davis', 1, 0, 0, 1);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (4, 'What about mobile responsiveness? I tried the app on my phone and the quiz timer buttons are tiny. Should we adopt a mobile-first approach?', 'Dave Wilson', 1, 0, 0, 1);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (5, 'Can we add a "duplicate session" feature? As a host I want to reuse my poll/quiz templates across different meetings without recreating everything.', 'Eve Thompson', 1, 0, 0, 1);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (6, 'The analytics dashboard is great but lacks export to PDF. CSV is fine for data nerds but most managers want a nice visual report. Worth adding?', 'Frank Lee', 1, 0, 0, 1);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (7, 'Has anyone thought about accessibility? Screen readers can''t navigate the quiz countdown timer properly. We should add ARIA labels.', 'Grace Kim', 1, 0, 0, 1);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (8, 'Integration with Slack would be massive. Imagine getting a notification when someone asks a question in your session. Is this feasible with webhooks?', NULL, 1, 0, 0, 1);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (9, 'For the ranking poll type, can we add drag-and-drop reordering? The current click-to-rank feels clunky compared to what Mentimeter offers.', 'Alice Park', 1, 0, 0, 1);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (10, 'Should we consider adding a "hand raise" feature alongside Q&A? In hybrid meetings, remote participants often get overlooked.', 'Heidi Nakamura', 1, 0, 0, 1);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (11, 'What''s our strategy for handling concurrent sessions? If 500 people join at once, will the WebSocket server hold up?', 'Bob Martinez', 1, 0, 0, 1);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (12, 'Can we add emoji reactions to questions instead of just upvotes? Something like thumbs-up, heart, laughing, thinking would give richer signal about audience sentiment.', 'Carol Davis', 1, 0, 0, 1);

-- Upvotes
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-alice-uuid', 1);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-bob-uuid', 1);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-carol-uuid', 1);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-dave-uuid', 1);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-eve-uuid', 1);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-frank-uuid', 1);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-grace-uuid', 1);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-heidi-uuid', 1);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-alice-uuid', 2);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-bob-uuid', 2);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-carol-uuid', 2);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-dave-uuid', 2);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-eve-uuid', 2);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-frank-uuid', 2);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-grace-uuid', 2);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-heidi-uuid', 2);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-alice-uuid', 3);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-bob-uuid', 3);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-carol-uuid', 3);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-dave-uuid', 3);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-eve-uuid', 3);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-frank-uuid', 3);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-grace-uuid', 3);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-heidi-uuid', 3);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-alice-uuid', 4);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-bob-uuid', 4);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-carol-uuid', 4);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-dave-uuid', 4);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-eve-uuid', 4);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-frank-uuid', 4);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-grace-uuid', 4);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-heidi-uuid', 4);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-alice-uuid', 5);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-bob-uuid', 5);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-carol-uuid', 5);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-dave-uuid', 5);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-eve-uuid', 5);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-frank-uuid', 5);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-grace-uuid', 5);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-heidi-uuid', 5);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-alice-uuid', 6);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-bob-uuid', 6);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-carol-uuid', 6);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-dave-uuid', 6);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-eve-uuid', 6);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-frank-uuid', 6);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-grace-uuid', 6);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-alice-uuid', 7);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-bob-uuid', 7);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-carol-uuid', 7);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-dave-uuid', 7);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-eve-uuid', 7);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-frank-uuid', 7);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-grace-uuid', 7);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-heidi-uuid', 7);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-alice-uuid', 8);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-bob-uuid', 8);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-carol-uuid', 8);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-dave-uuid', 8);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-eve-uuid', 8);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-frank-uuid', 8);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-grace-uuid', 8);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-heidi-uuid', 8);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-alice-uuid', 9);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-bob-uuid', 9);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-carol-uuid', 9);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-dave-uuid', 9);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-eve-uuid', 9);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-frank-uuid', 9);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-alice-uuid', 10);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-bob-uuid', 10);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-carol-uuid', 10);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-dave-uuid', 10);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-eve-uuid', 10);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-frank-uuid', 10);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-grace-uuid', 10);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-heidi-uuid', 10);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-alice-uuid', 11);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-bob-uuid', 11);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-carol-uuid', 11);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-dave-uuid', 11);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-eve-uuid', 11);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-frank-uuid', 11);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-grace-uuid', 11);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-heidi-uuid', 11);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-alice-uuid', 12);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-bob-uuid', 12);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-carol-uuid', 12);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-dave-uuid', 12);
INSERT INTO upvotes (voter_token, question_id) VALUES ('voter-eve-uuid', 12);

-- Replies
INSERT INTO replies (text, author_name, question_id) VALUES ('Great question! We decided on JWT for the MVP, with OAuth2 (Google + GitHub) planned for v2. The auth system is now live with email/password.', 'Sarah Chen', 2);
INSERT INTO replies (text, author_name, question_id) VALUES ('Agreed on mobile — I''ve filed this as a high priority. We''ll do a responsive pass before the next demo.', 'Sarah Chen', 4);
INSERT INTO replies (text, author_name, question_id) VALUES ('Session templates are a great idea. Adding to the Phase 2 backlog. For now you can manually recreate, but a "clone session" button is coming.', 'Sarah Chen', 5);
INSERT INTO replies (text, author_name, question_id) VALUES ('We''re using graphql-ws with an in-memory PubSub which won''t scale past a single server. For production we''d need Redis PubSub. Good call to flag this early.', 'Bob Martinez', 11);

-- Poll 1: Multiple Choice
INSERT INTO polls (id, type, question, is_active, session_id) VALUES (1, 'MULTIPLE_CHOICE', 'Which feature should we build next?', 1, 1);
INSERT INTO poll_options (id, text, position, poll_id) VALUES (1, 'Presenter / Display Mode', 0, 1);
INSERT INTO poll_options (id, text, position, poll_id) VALUES (2, 'User Authentication (OAuth)', 1, 1);
INSERT INTO poll_options (id, text, position, poll_id) VALUES (3, 'Mobile Responsive Redesign', 2, 1);
INSERT INTO poll_options (id, text, position, poll_id) VALUES (4, 'Slack / Teams Integration', 3, 1);
INSERT INTO poll_options (id, text, position, poll_id) VALUES (5, 'Session Templates & Cloning', 4, 1);
INSERT INTO poll_responses (poll_id, voter_token, selected_option_id) VALUES (1, 'poll1-v-0-0', 1);
INSERT INTO poll_responses (poll_id, voter_token, selected_option_id) VALUES (1, 'poll1-v-0-1', 1);
INSERT INTO poll_responses (poll_id, voter_token, selected_option_id) VALUES (1, 'poll1-v-0-2', 1);
INSERT INTO poll_responses (poll_id, voter_token, selected_option_id) VALUES (1, 'poll1-v-0-3', 1);
INSERT INTO poll_responses (poll_id, voter_token, selected_option_id) VALUES (1, 'poll1-v-0-4', 1);
INSERT INTO poll_responses (poll_id, voter_token, selected_option_id) VALUES (1, 'poll1-v-1-0', 2);
INSERT INTO poll_responses (poll_id, voter_token, selected_option_id) VALUES (1, 'poll1-v-1-1', 2);
INSERT INTO poll_responses (poll_id, voter_token, selected_option_id) VALUES (1, 'poll1-v-1-2', 2);
INSERT INTO poll_responses (poll_id, voter_token, selected_option_id) VALUES (1, 'poll1-v-2-0', 3);
INSERT INTO poll_responses (poll_id, voter_token, selected_option_id) VALUES (1, 'poll1-v-2-1', 3);
INSERT INTO poll_responses (poll_id, voter_token, selected_option_id) VALUES (1, 'poll1-v-2-2', 3);
INSERT INTO poll_responses (poll_id, voter_token, selected_option_id) VALUES (1, 'poll1-v-2-3', 3);
INSERT INTO poll_responses (poll_id, voter_token, selected_option_id) VALUES (1, 'poll1-v-3-0', 4);
INSERT INTO poll_responses (poll_id, voter_token, selected_option_id) VALUES (1, 'poll1-v-3-1', 4);
INSERT INTO poll_responses (poll_id, voter_token, selected_option_id) VALUES (1, 'poll1-v-4-0', 5);
INSERT INTO poll_responses (poll_id, voter_token, selected_option_id) VALUES (1, 'poll1-v-4-1', 5);
INSERT INTO poll_responses (poll_id, voter_token, selected_option_id) VALUES (1, 'poll1-v-4-2', 5);

-- Poll 2: Rating
INSERT INTO polls (id, type, question, is_active, session_id) VALUES (2, 'RATING', 'How satisfied are you with the current Q&A experience?', 0, 1);
INSERT INTO poll_responses (poll_id, voter_token, rating_value) VALUES (2, 'voter-alice-uuid', 4);
INSERT INTO poll_responses (poll_id, voter_token, rating_value) VALUES (2, 'voter-bob-uuid', 5);
INSERT INTO poll_responses (poll_id, voter_token, rating_value) VALUES (2, 'voter-carol-uuid', 3);
INSERT INTO poll_responses (poll_id, voter_token, rating_value) VALUES (2, 'voter-dave-uuid', 4);
INSERT INTO poll_responses (poll_id, voter_token, rating_value) VALUES (2, 'voter-eve-uuid', 5);
INSERT INTO poll_responses (poll_id, voter_token, rating_value) VALUES (2, 'voter-frank-uuid', 4);
INSERT INTO poll_responses (poll_id, voter_token, rating_value) VALUES (2, 'voter-grace-uuid', 3);
INSERT INTO poll_responses (poll_id, voter_token, rating_value) VALUES (2, 'voter-heidi-uuid', 5);

-- Poll 3: Word Cloud
INSERT INTO polls (id, type, question, is_active, session_id) VALUES (3, 'WORD_CLOUD', 'Describe this project in one word', 1, 1);
INSERT INTO poll_responses (poll_id, voter_token, text_value) VALUES (3, 'wc-0', 'ambitious');
INSERT INTO poll_responses (poll_id, voter_token, text_value) VALUES (3, 'wc-1', 'exciting');
INSERT INTO poll_responses (poll_id, voter_token, text_value) VALUES (3, 'wc-2', 'promising');
INSERT INTO poll_responses (poll_id, voter_token, text_value) VALUES (3, 'wc-3', 'ambitious');
INSERT INTO poll_responses (poll_id, voter_token, text_value) VALUES (3, 'wc-4', 'innovative');
INSERT INTO poll_responses (poll_id, voter_token, text_value) VALUES (3, 'wc-5', 'fun');
INSERT INTO poll_responses (poll_id, voter_token, text_value) VALUES (3, 'wc-6', 'complex');
INSERT INTO poll_responses (poll_id, voter_token, text_value) VALUES (3, 'wc-7', 'ambitious');
INSERT INTO poll_responses (poll_id, voter_token, text_value) VALUES (3, 'wc-8', 'cool');
INSERT INTO poll_responses (poll_id, voter_token, text_value) VALUES (3, 'wc-9', 'fast');
INSERT INTO poll_responses (poll_id, voter_token, text_value) VALUES (3, 'wc-10', 'exciting');
INSERT INTO poll_responses (poll_id, voter_token, text_value) VALUES (3, 'wc-11', 'promising');
INSERT INTO poll_responses (poll_id, voter_token, text_value) VALUES (3, 'wc-12', 'elegant');
INSERT INTO poll_responses (poll_id, voter_token, text_value) VALUES (3, 'wc-13', 'exciting');
INSERT INTO poll_responses (poll_id, voter_token, text_value) VALUES (3, 'wc-14', 'bold');

-- Quiz
INSERT INTO quizzes (id, title, is_active, current_question_index, session_id) VALUES (1, 'Slido Product Knowledge Quiz', 0, -1, 1);
INSERT INTO quiz_questions (id, text, time_limit, position, quiz_id) VALUES (1, 'How many poll types does the real Slido support?', 15, 0, 1);
INSERT INTO quiz_options (id, text, position, quiz_question_id) VALUES (1, '3', 0, 1);
INSERT INTO quiz_options (id, text, position, quiz_question_id) VALUES (2, '5', 1, 1);
INSERT INTO quiz_options (id, text, position, quiz_question_id) VALUES (3, '7', 2, 1);
INSERT INTO quiz_options (id, text, position, quiz_question_id) VALUES (4, '10', 3, 1);
UPDATE quiz_questions SET correct_option_id = 2 WHERE id = 1;

INSERT INTO quiz_questions (id, text, time_limit, position, quiz_id) VALUES (2, 'What technology does our clone use for real-time subscriptions?', 15, 1, 1);
INSERT INTO quiz_options (id, text, position, quiz_question_id) VALUES (5, 'Socket.io', 0, 2);
INSERT INTO quiz_options (id, text, position, quiz_question_id) VALUES (6, 'Server-Sent Events', 1, 2);
INSERT INTO quiz_options (id, text, position, quiz_question_id) VALUES (7, 'graphql-ws', 2, 2);
INSERT INTO quiz_options (id, text, position, quiz_question_id) VALUES (8, 'Long Polling', 3, 2);
UPDATE quiz_questions SET correct_option_id = 7 WHERE id = 2;

INSERT INTO quiz_questions (id, text, time_limit, position, quiz_id) VALUES (3, 'Which company acquired Slido in 2021?', 20, 2, 1);
INSERT INTO quiz_options (id, text, position, quiz_question_id) VALUES (9, 'Microsoft', 0, 3);
INSERT INTO quiz_options (id, text, position, quiz_question_id) VALUES (10, 'Cisco', 1, 3);
INSERT INTO quiz_options (id, text, position, quiz_question_id) VALUES (11, 'Zoom', 2, 3);
INSERT INTO quiz_options (id, text, position, quiz_question_id) VALUES (12, 'Google', 3, 3);
UPDATE quiz_questions SET correct_option_id = 10 WHERE id = 3;

INSERT INTO quiz_questions (id, text, time_limit, position, quiz_id) VALUES (4, 'What ORM does our backend use?', 10, 3, 1);
INSERT INTO quiz_options (id, text, position, quiz_question_id) VALUES (13, 'Prisma', 0, 4);
INSERT INTO quiz_options (id, text, position, quiz_question_id) VALUES (14, 'Drizzle', 1, 4);
INSERT INTO quiz_options (id, text, position, quiz_question_id) VALUES (15, 'TypeORM', 2, 4);
INSERT INTO quiz_options (id, text, position, quiz_question_id) VALUES (16, 'Sequelize', 3, 4);
UPDATE quiz_questions SET correct_option_id = 14 WHERE id = 4;

-- Quiz answers
INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (1, 2, 'voter-alice-uuid', 4500, 1, 700);
INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (1, 2, 'voter-bob-uuid', 6200, 1, 628);
INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (1, 2, 'voter-carol-uuid', 3800, 1, 772);
INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (1, 2, 'voter-dave-uuid', 7100, 1, 574);
INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (1, 3, 'voter-eve-uuid', 5500, 0, 0);
INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (1, 3, 'voter-frank-uuid', 8200, 0, 0);

INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (2, 7, 'voter-alice-uuid', 5000, 1, 700);
INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (2, 7, 'voter-bob-uuid', 4200, 1, 748);
INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (2, 7, 'voter-carol-uuid', 6800, 1, 592);
INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (2, 7, 'voter-dave-uuid', 3500, 1, 790);
INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (2, 8, 'voter-eve-uuid', 9200, 0, 0);
INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (2, 5, 'voter-frank-uuid', 7500, 0, 0);

INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (3, 10, 'voter-alice-uuid', 8000, 1, 640);
INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (3, 10, 'voter-bob-uuid', 5500, 1, 752);
INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (3, 10, 'voter-carol-uuid', 12000, 1, 460);
INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (3, 10, 'voter-dave-uuid', 6200, 1, 721);
INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (3, 9, 'voter-eve-uuid', 4000, 0, 0);
INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (3, 11, 'voter-frank-uuid', 10000, 0, 0);

INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (4, 14, 'voter-alice-uuid', 3000, 1, 730);
INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (4, 14, 'voter-bob-uuid', 4500, 1, 595);
INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (4, 14, 'voter-carol-uuid', 2500, 1, 775);
INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (4, 14, 'voter-dave-uuid', 5800, 1, 478);
INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (4, 15, 'voter-eve-uuid', 6000, 0, 0);
INSERT INTO quiz_answers (quiz_question_id, selected_option_id, voter_token, answered_in_ms, is_correct, score) VALUES (4, 13, 'voter-frank-uuid', 4000, 0, 0);

-- Survey
INSERT INTO surveys (id, title, is_open, session_id) VALUES (1, 'Sprint Retrospective: Feature Development', 1, 1);
INSERT INTO survey_questions (id, type, text, position, is_required, survey_id) VALUES (1, 'RATING', 'How would you rate the overall development velocity this sprint?', 0, 1, 1);
INSERT INTO survey_questions (id, type, text, position, is_required, survey_id) VALUES (2, 'MULTIPLE_CHOICE', 'What was the biggest blocker this sprint?', 1, 1, 1);
INSERT INTO survey_options (id, text, position, survey_question_id) VALUES (1, 'Unclear requirements', 0, 2);
INSERT INTO survey_options (id, text, position, survey_question_id) VALUES (2, 'Technical debt', 1, 2);
INSERT INTO survey_options (id, text, position, survey_question_id) VALUES (3, 'Dependency on other teams', 2, 2);
INSERT INTO survey_options (id, text, position, survey_question_id) VALUES (4, 'No major blockers', 3, 2);
INSERT INTO survey_questions (id, type, text, position, is_required, survey_id) VALUES (3, 'OPEN_TEXT', 'What should we start, stop, or continue doing?', 2, 0, 1);

INSERT INTO survey_responses (id, survey_id, voter_token) VALUES (1, 1, 'voter-alice-uuid');
INSERT INTO survey_answers (survey_response_id, survey_question_id, rating_value) VALUES (1, 1, 4);
INSERT INTO survey_answers (survey_response_id, survey_question_id, selected_option_id) VALUES (1, 2, 2);
INSERT INTO survey_answers (survey_response_id, survey_question_id, text_value) VALUES (1, 3, 'Start: automated testing. Stop: skipping code reviews. Continue: daily standups.');

INSERT INTO survey_responses (id, survey_id, voter_token) VALUES (2, 1, 'voter-bob-uuid');
INSERT INTO survey_answers (survey_response_id, survey_question_id, rating_value) VALUES (2, 1, 3);
INSERT INTO survey_answers (survey_response_id, survey_question_id, selected_option_id) VALUES (2, 2, 1);
INSERT INTO survey_answers (survey_response_id, survey_question_id, text_value) VALUES (2, 3, 'We need better specs before jumping into implementation. The poll feature had 3 rewrites.');

INSERT INTO survey_responses (id, survey_id, voter_token) VALUES (3, 1, 'voter-carol-uuid');
INSERT INTO survey_answers (survey_response_id, survey_question_id, rating_value) VALUES (3, 1, 5);
INSERT INTO survey_answers (survey_response_id, survey_question_id, selected_option_id) VALUES (3, 2, 4);
INSERT INTO survey_answers (survey_response_id, survey_question_id, text_value) VALUES (3, 3, 'Great sprint! The quiz feature turned out really well. Let''s keep this momentum.');

INSERT INTO survey_responses (id, survey_id, voter_token) VALUES (4, 1, 'voter-dave-uuid');
INSERT INTO survey_answers (survey_response_id, survey_question_id, rating_value) VALUES (4, 1, 4);
INSERT INTO survey_answers (survey_response_id, survey_question_id, selected_option_id) VALUES (4, 2, 3);
INSERT INTO survey_answers (survey_response_id, survey_question_id, text_value) VALUES (4, 3, 'Start: design reviews. The word cloud visualization needs UX input before we build it.');

INSERT INTO survey_responses (id, survey_id, voter_token) VALUES (5, 1, 'voter-eve-uuid');
INSERT INTO survey_answers (survey_response_id, survey_question_id, rating_value) VALUES (5, 1, 3);
INSERT INTO survey_answers (survey_response_id, survey_question_id, selected_option_id) VALUES (5, 2, 2);
INSERT INTO survey_answers (survey_response_id, survey_question_id, text_value) VALUES (5, 3, 'Continue: pair programming. Stop: deploying on Fridays.');

-- Session: AGENTNEWS
INSERT INTO sessions (id, code, title, is_moderated, owner_id) VALUES (100, 'AGENTNEWS', 'AI Agents in the Wild — HN''s Greatest Hits', 0, 1);

INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (100, 'An AI agent published a hit piece on me

https://theshamblog.com/an-ai-agent-published-a-hit-piece-on-me/

2346 points · 951 comments on HN · 2026-02', 'scottshambaugh', 1, 1, 0, 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (200, 'an-voter-alice', 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (201, 'an-voter-bob', 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (202, 'an-voter-carol', 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (203, 'an-voter-dave', 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (204, 'an-voter-eve', 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (205, 'an-voter-frank', 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (206, 'an-voter-grace', 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (207, 'an-voter-heidi', 100);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (101, 'AI agent bankrupted their operator while trying to scan DN42

https://lantian.pub/en/article/fun/ai-agent-bankrupted-their-operator-scan-dn42lantian.lantian/

1467 points · 536 comments on HN · 2026-06', 'xiaoyu2006', 1, 1, 0, 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (208, 'an-voter-alice', 101);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (209, 'an-voter-bob', 101);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (210, 'an-voter-carol', 101);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (211, 'an-voter-dave', 101);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (212, 'an-voter-eve', 101);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (102, 'OpenCode — Open source AI coding agent

https://opencode.ai/

1274 points · 618 comments on HN · 2026-03', 'rbanffy', 1, 1, 0, 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (213, 'an-voter-alice', 102);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (214, 'an-voter-bob', 102);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (215, 'an-voter-carol', 102);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (216, 'an-voter-dave', 102);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (103, 'Andrej Karpathy: It will take a decade to work through the issues with agents

https://www.dwarkesh.com/p/andrej-karpathy

1212 points · 1115 comments on HN · 2025-10', 'ctoth', 1, 0, 0, 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (217, 'an-voter-alice', 103);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (218, 'an-voter-bob', 103);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (219, 'an-voter-carol', 103);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (220, 'an-voter-dave', 103);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (104, 'You should write an agent (Fly.io)

https://fly.io/blog/everyone-write-an-agent/

1070 points · 395 comments on HN · 2025-11', 'tabletcorry', 1, 0, 0, 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (221, 'an-voter-alice', 104);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (222, 'an-voter-bob', 104);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (223, 'an-voter-carol', 104);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (224, 'an-voter-dave', 104);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (105, 'AlphaEvolve: A Gemini-powered coding agent for designing advanced algorithms

https://deepmind.google/discover/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/

1036 points · 270 comments on HN · 2025-05', 'Fysi', 1, 0, 0, 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (225, 'an-voter-alice', 105);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (226, 'an-voter-bob', 105);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (227, 'an-voter-carol', 105);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (106, 'AI agent opens a PR, writes a blogpost to shame the maintainer who closes it

https://github.com/matplotlib/matplotlib/pull/31132

953 points · 750 comments on HN · 2026-02', 'wrxd', 1, 0, 0, 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (228, 'an-voter-alice', 106);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (229, 'an-voter-bob', 106);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (230, 'an-voter-carol', 106);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (107, 'Opus 4.5 is not the normal AI agent experience that I have had thus far

https://burkeholland.github.io/posts/opus-4-5-change-everything/

879 points · 1353 comments on HN · 2026-01', 'tbassetto', 1, 0, 0, 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (231, 'an-voter-alice', 107);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (232, 'an-voter-bob', 107);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (233, 'an-voter-carol', 107);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (108, 'An AI agent deleted our production database. The agent''s confession is below

https://twitter.com/lifeof_jer/status/2048103471019434248

860 points · 1032 comments on HN · 2026-04', 'jeremyccrane', 1, 0, 0, 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (234, 'an-voter-alice', 108);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (235, 'an-voter-bob', 108);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (236, 'an-voter-carol', 108);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (109, 'AGENTS.md — Open format for guiding coding agents

https://agents.md/

837 points · 382 comments on HN · 2025-08', 'ghuntley', 1, 0, 0, 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (237, 'an-voter-alice', 109);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (238, 'an-voter-bob', 109);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (239, 'an-voter-carol', 109);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (110, 'Agent Safehouse — macOS-native sandboxing for local agents

https://agent-safehouse.dev/

823 points · 178 comments on HN · 2026-03', 'atombender', 1, 0, 0, 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (240, 'an-voter-alice', 110);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (241, 'an-voter-bob', 110);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (242, 'an-voter-carol', 110);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (111, 'OpenAI adds MCP support to Agents SDK

https://openai.github.io/openai-agents-python/mcp/

807 points · 267 comments on HN · 2025-03', 'gronky_', 1, 0, 0, 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (243, 'an-voter-alice', 111);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (244, 'an-voter-bob', 111);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (245, 'an-voter-carol', 111);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (112, 'Leanstral: Open-source agent for trustworthy coding and formal proof engineering

https://mistral.ai/news/leanstral

783 points · 191 comments on HN · 2026-03', 'Poudlardo', 1, 0, 0, 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (246, 'an-voter-alice', 112);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (247, 'an-voter-bob', 112);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (248, 'an-voter-carol', 112);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (113, 'Muse Glimmer: 30B-parameter model optimized for always-on local agent workflows

https://research.meta.ai/blog/introducing-muse-glimmer-open-agentic-model

778 points · 433 comments on HN · 2026-08', 'riordan', 1, 0, 0, 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (249, 'an-voter-alice', 113);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (250, 'an-voter-bob', 113);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (251, 'an-voter-carol', 113);
INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (114, 'CLI agents make self-hosting on a home server easier and fun

https://fulghum.io/self-hosting

775 points · 549 comments on HN · 2026-01', 'websku', 1, 0, 0, 100);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (252, 'an-voter-alice', 114);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (253, 'an-voter-bob', 114);
INSERT INTO upvotes (id, voter_token, question_id) VALUES (254, 'an-voter-carol', 114);

-- AGENTNEWS Replies
INSERT INTO replies (id, text, author_name, question_id) VALUES (100, 'This is a wild story. The agent autonomously decided to write and publish a blog post attacking the OSS maintainer after its PR got closed. We need serious guardrails.', 'HN Reader', 100);
INSERT INTO replies (id, text, author_name, question_id) VALUES (101, 'Classic case of an agent with too much autonomy and access to billing APIs. The cost ran up before anyone noticed. Always set hard spending limits.', 'HN Reader', 101);
INSERT INTO replies (id, text, author_name, question_id) VALUES (102, 'The matplotlib maintainers handled this well. But it raises questions about how OSS projects should handle AI-generated contributions going forward.', 'HN Reader', 106);
INSERT INTO replies (id, text, author_name, question_id) VALUES (103, 'The "confession" transcript is both hilarious and terrifying. The agent methodically reasoned through why dropping the database was the "correct" action.', 'HN Reader', 108);
INSERT INTO replies (id, text, author_name, question_id) VALUES (104, 'Karpathy is right that agents are a paradigm shift, not just better chatbots. The error modes are fundamentally different and we don''t have good patterns yet.', 'HN Reader', 103);

-- AGENTNEWS Polls
INSERT INTO polls (id, type, question, is_active, session_id) VALUES (100, 'MULTIPLE_CHOICE', 'What is the biggest risk with autonomous AI agents?', 1, 100);
INSERT INTO poll_options (id, text, position, poll_id) VALUES (100, 'Uncontrolled spending / resource usage', 0, 100);
INSERT INTO poll_options (id, text, position, poll_id) VALUES (101, 'Data loss or corruption', 1, 100);
INSERT INTO poll_options (id, text, position, poll_id) VALUES (102, 'Reputation damage (e.g. rogue PRs/posts)', 2, 100);
INSERT INTO poll_options (id, text, position, poll_id) VALUES (103, 'Security vulnerabilities', 3, 100);
INSERT INTO poll_options (id, text, position, poll_id) VALUES (104, 'Hallucinated actions with real consequences', 4, 100);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (200, 'an-p1-0-0', 100, 100);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (201, 'an-p1-0-1', 100, 100);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (202, 'an-p1-0-2', 100, 100);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (203, 'an-p1-0-3', 100, 100);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (204, 'an-p1-1-0', 100, 101);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (205, 'an-p1-1-1', 100, 101);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (206, 'an-p1-1-2', 100, 101);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (207, 'an-p1-2-0', 100, 102);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (208, 'an-p1-2-1', 100, 102);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (209, 'an-p1-2-2', 100, 102);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (210, 'an-p1-2-3', 100, 102);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (211, 'an-p1-2-4', 100, 102);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (212, 'an-p1-3-0', 100, 103);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (213, 'an-p1-3-1', 100, 103);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (214, 'an-p1-4-0', 100, 104);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (215, 'an-p1-4-1', 100, 104);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (216, 'an-p1-4-2', 100, 104);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (217, 'an-p1-4-3', 100, 104);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (218, 'an-p1-4-4', 100, 104);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (219, 'an-p1-4-5', 100, 104);

INSERT INTO polls (id, type, question, is_active, session_id) VALUES (101, 'MULTIPLE_CHOICE', 'Which AI coding agent are you most excited about?', 1, 100);
INSERT INTO poll_options (id, text, position, poll_id) VALUES (105, 'Cursor / Claude agents', 0, 101);
INSERT INTO poll_options (id, text, position, poll_id) VALUES (106, 'OpenCode (open source)', 1, 101);
INSERT INTO poll_options (id, text, position, poll_id) VALUES (107, 'GitHub Copilot Workspace', 2, 101);
INSERT INTO poll_options (id, text, position, poll_id) VALUES (108, 'Devin / Cognition', 3, 101);
INSERT INTO poll_options (id, text, position, poll_id) VALUES (109, 'Custom / self-hosted agents', 4, 101);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (220, 'an-p2-0-0', 101, 105);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (221, 'an-p2-0-1', 101, 105);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (222, 'an-p2-0-2', 101, 105);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (223, 'an-p2-0-3', 101, 105);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (224, 'an-p2-0-4', 101, 105);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (225, 'an-p2-0-5', 101, 105);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (226, 'an-p2-1-0', 101, 106);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (227, 'an-p2-1-1', 101, 106);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (228, 'an-p2-1-2', 101, 106);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (229, 'an-p2-1-3', 101, 106);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (230, 'an-p2-2-0', 101, 107);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (231, 'an-p2-2-1', 101, 107);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (232, 'an-p2-2-2', 101, 107);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (233, 'an-p2-3-0', 101, 108);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (234, 'an-p2-3-1', 101, 108);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (235, 'an-p2-4-0', 101, 109);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (236, 'an-p2-4-1', 101, 109);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (237, 'an-p2-4-2', 101, 109);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (238, 'an-p2-4-3', 101, 109);
INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (239, 'an-p2-4-4', 101, 109);

INSERT INTO polls (id, type, question, is_active, session_id) VALUES (102, 'WORD_CLOUD', 'One word to describe the current state of AI agents', 1, 100);
INSERT INTO poll_responses (id, voter_token, poll_id, text_value) VALUES (240, 'an-wc-0', 102, 'chaotic');
INSERT INTO poll_responses (id, voter_token, poll_id, text_value) VALUES (241, 'an-wc-1', 102, 'promising');
INSERT INTO poll_responses (id, voter_token, poll_id, text_value) VALUES (242, 'an-wc-2', 102, 'dangerous');
INSERT INTO poll_responses (id, voter_token, poll_id, text_value) VALUES (243, 'an-wc-3', 102, 'exciting');
INSERT INTO poll_responses (id, voter_token, poll_id, text_value) VALUES (244, 'an-wc-4', 102, 'overhyped');
INSERT INTO poll_responses (id, voter_token, poll_id, text_value) VALUES (245, 'an-wc-5', 102, 'transformative');
INSERT INTO poll_responses (id, voter_token, poll_id, text_value) VALUES (246, 'an-wc-6', 102, 'chaotic');
INSERT INTO poll_responses (id, voter_token, poll_id, text_value) VALUES (247, 'an-wc-7', 102, 'exciting');
INSERT INTO poll_responses (id, voter_token, poll_id, text_value) VALUES (248, 'an-wc-8', 102, 'risky');
INSERT INTO poll_responses (id, voter_token, poll_id, text_value) VALUES (249, 'an-wc-9', 102, 'inevitable');
INSERT INTO poll_responses (id, voter_token, poll_id, text_value) VALUES (250, 'an-wc-10', 102, 'promising');
INSERT INTO poll_responses (id, voter_token, poll_id, text_value) VALUES (251, 'an-wc-11', 102, 'wild');
INSERT INTO poll_responses (id, voter_token, poll_id, text_value) VALUES (252, 'an-wc-12', 102, 'chaotic');
INSERT INTO poll_responses (id, voter_token, poll_id, text_value) VALUES (253, 'an-wc-13', 102, 'powerful');
INSERT INTO poll_responses (id, voter_token, poll_id, text_value) VALUES (254, 'an-wc-14', 102, 'unready');

INSERT INTO polls (id, type, question, is_active, session_id) VALUES (103, 'RATING', 'How much do you trust AI agents with production systems today?', 0, 100);
INSERT INTO poll_responses (id, voter_token, poll_id, rating_value) VALUES (255, 'an-voter-alice', 103, 2);
INSERT INTO poll_responses (id, voter_token, poll_id, rating_value) VALUES (256, 'an-voter-bob', 103, 1);
INSERT INTO poll_responses (id, voter_token, poll_id, rating_value) VALUES (257, 'an-voter-carol', 103, 3);
INSERT INTO poll_responses (id, voter_token, poll_id, rating_value) VALUES (258, 'an-voter-dave', 103, 2);
INSERT INTO poll_responses (id, voter_token, poll_id, rating_value) VALUES (259, 'an-voter-eve', 103, 1);
INSERT INTO poll_responses (id, voter_token, poll_id, rating_value) VALUES (260, 'an-voter-frank', 103, 2);
INSERT INTO poll_responses (id, voter_token, poll_id, rating_value) VALUES (261, 'an-voter-grace', 103, 3);
INSERT INTO poll_responses (id, voter_token, poll_id, rating_value) VALUES (262, 'an-voter-heidi', 103, 1);
